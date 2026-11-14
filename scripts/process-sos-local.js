const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local if present
let env = {};
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const [k, ...v] = line.trim().split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim();
  });
}

const URL = process.env.SUPABASE_URL || env.SUPABASE_URL || 'https://kfsjwzsxlaabnixpgoke.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found in environment or .env.local');
  process.exit(1);
}

const supabase = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function extractSupplyNeeds(category, message = '') {
  const text = (message || '').toLowerCase();
  const needs = { food: 0, water: 0, doctor: 0, shelter: 0, medicines: 0 };

  if (category === 'Food / Water' || text.includes('food') || text.includes('water') || text.includes('khana') || text.includes('pani')) {
    needs.food = 1;
    needs.water = 1;
  }
  if (category === 'Medical Emergency' || text.includes('injured') || text.includes('doctor') || text.includes('medicine') || text.includes('chot') || text.includes('hospital')) {
    needs.doctor = 1;
    needs.medicines = 1;
  }
  if (category === 'Shelter Needed' || text.includes('shelter') || text.includes('roof') || text.includes('chhat') || text.includes('camp')) {
    needs.shelter = 1;
  }
  return needs;
}

function extractDistrict(lat, lng, device = '', message = '') {
  const text = (message || '').toLowerCase();
  if (text.includes('kashmiri gate') || text.includes('kashmere gate') || text.includes('majnu ka tilla') || text.includes('civil lines') || text.includes('wazirabad')) {
    return 'North Delhi';
  }
  if (text.includes('yamuna vihar') || text.includes('shahdara') || text.includes('seelampur')) {
    return 'East Delhi';
  }
  if (lat > 28.65 && lng > 77.18 && lng < 77.26) {
    return 'North Delhi';
  }
  return device || 'Central Delhi';
}

async function processAll() {
  console.log('Checking for unprocessed SOS reports in local Supabase...');
  const { data: rawReports, error: rawErr } = await supabase
    .from('sos_reports')
    .select('*')
    .order('created_at', { ascending: true });

  if (rawErr) {
    console.error('Error fetching raw reports:', rawErr.message);
    return;
  }

  const { data: processed, error: procErr } = await supabase
    .from('sos_reports_processed')
    .select('id');

  const existingIds = new Set((processed || []).map((r) => r.id));
  const toProcess = (rawReports || []).filter((r) => !existingIds.has(r.id));

  console.log(`Total raw: ${rawReports.length}, Already processed: ${existingIds.size}, To process: ${toProcess.length}`);

  for (const r of toProcess) {
    const district = r.district || extractDistrict(r.latitude, r.longitude, r.source_device, r.message);
    const needs = extractSupplyNeeds(r.category, r.message);

    const { error: insErr } = await supabase.from('sos_reports_processed').insert({
      id: r.id,
      source_project: 'local',
      name: r.name,
      phone: r.phone,
      latitude: r.latitude,
      longitude: r.longitude,
      category: r.category,
      message: r.message,
      created_at: r.created_at,
      district: district,
      detailed_area: r.district || district,
      verified_severity: r.severity,
      supply_requirements: needs,
      casualties_reported: r.severity >= 5,
      processed_at: new Date().toISOString(),
      rephrased_message: r.message,
    });

    if (insErr) {
      console.error(`Failed to insert report ${r.id}:`, insErr.message);
    } else {
      console.log(`Processed report ${r.id} (${district})`);
    }
  }

  console.log('Local processing complete. Zero external dependencies needed.');
}

processAll().catch(console.error);
