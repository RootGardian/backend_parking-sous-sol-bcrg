import fetch from 'node-fetch';
import { Temporal, Intl, toTemporalInstant } from '@js-temporal/polyfill';
globalThis.Temporal = Temporal;

const BASE_URL = 'http://localhost:3000/api';
let token = '';

async function runTests() {
  console.log('--- Démarrage des tests API ---');

  try {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matricule: '123478', mot_de_passe: 'Password123' })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(loginData.message || loginData.error);
    token = loginData.token;
    console.log('✅ Auth (Login): Success');
  } catch (err: any) {
    console.error('❌ Auth (Login): Failed -', err.message);
    return;
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  try {
    const res = await fetch(`${BASE_URL}/v1/admin/utilisateurs`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        nom: 'Nouveau',
        prenom: 'Admin',
        matricule: 'ADMIN-' + Date.now(),
        mot_de_passe: 'Admin123',
        role: 'admin'
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Status ${res.status}: ${JSON.stringify(data)}`);
    console.log('✅ POST /admin/utilisateurs (admin creation): Success');
  } catch (err: any) {
    console.error('❌ POST /admin/utilisateurs: Failed -', err.message);
  }
}

runTests();
