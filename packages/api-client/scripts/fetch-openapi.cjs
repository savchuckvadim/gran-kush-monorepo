#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const OUTPUT_FILE = path.join(__dirname, '../openapi.json');

console.log(`📥 Fetching OpenAPI spec from ${API_URL}/docs-json...`);

http.get(`${API_URL}/docs-json`, (res) => {
    let data = '';

    if (res.statusCode !== 200) {
        console.error(`❌ Failed to fetch OpenAPI spec. Status: ${res.statusCode}`);
        process.exit(1);
    }

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            // Validate JSON
            const json = JSON.parse(data);
            
            // Write to file
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(json, null, 2));
            
            console.log(`✅ OpenAPI spec saved to ${OUTPUT_FILE}`);
            console.log(`📊 Found ${Object.keys(json.paths || {}).length} paths`);
        } catch (error) {
            console.error('❌ Error parsing JSON:', error.message);
            process.exit(1);
        }
    });
}).on('error', (err) => {
    console.error(`❌ Error fetching OpenAPI spec: ${err.message}`);
    console.error(`💡 Make sure the API server is running on ${API_URL}`);
    process.exit(1);
});
