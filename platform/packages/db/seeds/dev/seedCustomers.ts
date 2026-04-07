import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { batchInsert, jitterCoord, pick, randInt } from './helpers.js';
import { FIRST_NAMES_M, FIRST_NAMES_F, LAST_NAMES, NEIGHBOURHOODS } from './fixtures.js';

export interface SeededCustomer {
  id: string;
  name: string;
  address: {
    id: string;
    street: string;
    city: string;
    postal_code: string;
    lat: number;
    lng: number;
  };
}

export async function seedCustomers(
  client: PoolClient,
  rng: () => number,
  count = 75,
): Promise<SeededCustomer[]> {
  const customers: Record<string, unknown>[] = [];
  const addresses: Record<string, unknown>[] = [];
  const result: SeededCustomer[] = [];

  for (let i = 0; i < count; i++) {
    const isFemale = rng() < 0.5;
    const firstName = isFemale ? pick(FIRST_NAMES_F, rng) : pick(FIRST_NAMES_M, rng);
    const lastName  = pick(LAST_NAMES, rng);
    const name      = `${firstName} ${lastName}`;

    // Unique email: firstname.lastname.N@email.com (lowercased, accents stripped)
    const emailBase = `${firstName}.${lastName}`.toLowerCase()
      .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/å/g, 'a').replace(/\s/g, '.');
    const email = `${emailBase}.${i + 1}@ecobitedemo.fi`;

    const phone = `+3584${randInt(0, 9, rng)}${String(randInt(1000000, 9999999, rng))}`;

    const customerId = randomUUID();

    // Pick a neighbourhood for the customer's home address
    const hood = pick(NEIGHBOURHOODS, rng);
    const streetNum = randInt(1, 40, rng);
    const street = `${pick(hood.streets, rng)} ${streetNum}`;
    const lat = jitterCoord(hood.lat, 0.008, rng);
    const lng = jitterCoord(hood.lng, 0.012, rng);
    const addressId = randomUUID();

    customers.push({
      id: customerId,
      email,
      phone,
      name,
      status: 'active',
      locale: 'fi-FI',
      created_at: new Date(Date.now() - randInt(30, 180, rng) * 86400_000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    addresses.push({
      id: addressId,
      customer_id: customerId,
      label: 'home',
      street,
      city: hood.name,
      postal_code: hood.postalCode,
      country: 'FI',
      lat,
      lng,
      is_default: true,
      created_at: new Date().toISOString(),
    });

    result.push({
      id: customerId,
      name,
      address: { id: addressId, street, city: hood.name, postal_code: hood.postalCode, lat, lng },
    });
  }

  await batchInsert(client, 'customers',
    ['id', 'email', 'phone', 'name', 'status', 'locale', 'created_at', 'updated_at'],
    customers,
  );

  await batchInsert(client, 'customer_addresses',
    ['id', 'customer_id', 'label', 'street', 'city', 'postal_code', 'country', 'lat', 'lng', 'is_default', 'created_at'],
    addresses,
  );

  console.log(`  ✓ customers: ${customers.length}`);
  console.log(`  ✓ customer_addresses: ${addresses.length}`);

  return result;
}
