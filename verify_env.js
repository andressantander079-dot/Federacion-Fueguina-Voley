const fs = require('fs');
const path = require('path');
const envPath = path.join(process.cwd(), '.env.local');

console.log('Checking for .env.local at:', envPath);

if (fs.existsSync(envPath)) {
    function checkFile(fileName) {
        const filePath = path.join(process.cwd(), fileName);
        console.log(`\n🔍 Checking ${fileName}...`);

        if (!fs.existsSync(filePath)) {
            console.log(`   ❌ File not found.`);
            return;
        }

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            let found = false;

            lines.forEach((line, index) => {
                // Visualize whitespace
                const raw = JSON.stringify(line);

                if (line.includes('SUPABASE_SERVICE_ROLE_KEY')) {
                    console.log(`   👉 Found on Line ${index + 1}: ${raw}`);

                    const trimmed = line.trim();
                    if (trimmed.startsWith('#')) {
                        console.log('      ⚠️  Line is commented out (#)');
                        return;
                    }

                    // Check formatting
                    const parts = trimmed.split('=');
                    if (parts.length < 2) {
                        console.log('      ❌ ERROR: No "=" character found.');
                    } else {
                        const key = parts[0];
                        if (key !== 'SUPABASE_SERVICE_ROLE_KEY') {
                            console.log(`      ⚠️  Key has extra spaces or chars: "${key}" (Expected "SUPABASE_SERVICE_ROLE_KEY")`);
                        } else {
                            console.log('      ✅ Key format looks correct.');
                        }
                    }
                    found = true;
                }
            });

            if (!found) {
                console.log('   ❌ Key word SUPABASE_SERVICE_ROLE_KEY not found in file.');
            }

        } catch (err) {
            console.error('   ❌ Error reading file:', err);
        }
    }

    console.log('--- START DIAGNOSTIC ---');
    checkFile('.env.local');
    console.log('--- END DIAGNOSTIC ---');

} else {
    console.log('❌ .env.local NOT FOUND');
    // List dir to see what is there
    const dir = fs.readdirSync(process.cwd());
    console.log('Files in directory:', dir.filter(f => f.startsWith('.env')));
}
