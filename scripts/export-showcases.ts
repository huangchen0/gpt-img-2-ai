#!/usr/bin/env tsx

/**
 * Export showcases data to JSON file
 * Usage: pnpm tsx scripts/export-showcases.ts
 */

import { db } from '@/core/db';
import { showcase } from '@/config/db/schema';
import * as fs from 'fs';
import * as path from 'path';

async function exportShowcases() {
  try {
    console.log('Fetching showcases from database...');

    const showcases = await db()
      .select()
      .from(showcase)
      .orderBy(showcase.createdAt);

    console.log(`Found ${showcases.length} showcases`);

    // Convert dates to ISO strings for JSON serialization
    const exportData = showcases.map((item: any) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    }));

    const outputPath = path.join(process.cwd(), 'showcases-export.json');
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));

    console.log(`✅ Showcases exported to: ${outputPath}`);
    console.log(`Total records: ${showcases.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

exportShowcases();
