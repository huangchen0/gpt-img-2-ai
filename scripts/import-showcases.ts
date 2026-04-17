#!/usr/bin/env tsx

/**
 * Import showcases data from JSON file
 * Usage: pnpm tsx scripts/import-showcases.ts [json-file-path]
 */

import { db } from '@/core/db';
import { showcase } from '@/config/db/schema';
import * as fs from 'fs';
import * as path from 'path';

async function importShowcases() {
  try {
    const jsonFilePath = process.argv[2] || path.join(process.cwd(), 'showcases-export.json');

    if (!fs.existsSync(jsonFilePath)) {
      console.error(`❌ File not found: ${jsonFilePath}`);
      process.exit(1);
    }

    console.log(`Reading showcases from: ${jsonFilePath}`);

    const fileContent = fs.readFileSync(jsonFilePath, 'utf-8');
    const showcases = JSON.parse(fileContent);

    console.log(`Found ${showcases.length} showcases to import`);

    // Convert ISO strings back to Date objects
    const importData = showcases.map((item: any) => ({
      ...item,
      createdAt: new Date(item.createdAt),
    }));

    // Insert showcases in batches to avoid overwhelming the database
    const batchSize = 10;
    let imported = 0;

    for (let i = 0; i < importData.length; i += batchSize) {
      const batch = importData.slice(i, i + batchSize);
      await db().insert(showcase).values(batch).onConflictDoNothing();
      imported += batch.length;
      console.log(`Imported ${imported}/${importData.length} showcases...`);
    }

    console.log(`✅ Successfully imported ${imported} showcases`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

importShowcases();
