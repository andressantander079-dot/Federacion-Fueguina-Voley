const fs = require('fs');
const file = 'c:/Users/rocio/OneDrive/Escritorio/Federacion Oficial de Voley/federacion-voley-ushuaia/src/app/admin/competencias/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /<Link href=\{`\/ admin \/ competencias \/ \$\{ t\.id \} `\}>/g,
    '<Link href={`/admin/competencias/${t.id}`}>'
);

content = content.replace(
    /bg - zinc - 900 p - 0 rounded - xl shadow - sm border border - zinc - 800 hover: shadow - md hover: border - tdf - blue transition cursor - pointer relative overflow - hidden flex flex - col h - full \$\{ t\.status === 'archivado' \? 'opacity-50 grayscale' : '' \} /g,
    "bg-zinc-900 p-0 rounded-xl shadow-sm border border-zinc-800 hover:shadow-md hover:border-tdf-blue transition cursor-pointer relative overflow-hidden flex flex-col h-full ${t.status === 'archivado' ? 'opacity-50 grayscale' : ''}"
);

content = content.replace(
    /h - 1\.5 w - full \$\{ t\.status === 'activo' \? 'bg-green-500' : t\.status === 'archivado' \? 'bg-zinc-500' : 'bg-yellow-500' \} /g,
    "h-1.5 w-full ${t.status === 'activo' ? 'bg-green-500' : t.status === 'archivado' ? 'bg-zinc-500' : 'bg-yellow-500'}"
);

content = content.replace(
    /px - 2 py - 1 rounded text - \[10px\] font - black uppercase tracking - wider \$\{ t\.status === 'activo' \? 'bg-green-500\/10 text-green-500' : t\.status === 'archivado' \? 'bg-zinc-800 text-zinc-400' : 'bg-yellow-500\/10 text-yellow-500' \} /g,
    "px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${t.status === 'activo' ? 'bg-green-500/10 text-green-500' : t.status === 'archivado' ? 'bg-zinc-800 text-zinc-400' : 'bg-yellow-500/10 text-yellow-500'}"
);

content = content.replace(
    /px - 3 py - 1 text - xs font - bold rounded - lg border uppercase w - full text - center \$\{\s*t\.gender === 'Femenino' \? 'bg-pink-500\/10 text-pink-500 border-pink-500\/20' : t\.gender === 'Masculino' \? 'bg-blue-500\/10 text-blue-500 border-blue-500\/20' : 'bg-purple-500\/10 text-purple-500 border-purple-500\/20'\s*\} /g,
    "px-3 py-1 text-xs font-bold rounded-lg border uppercase w-full text-center ${t.gender === 'Femenino' ? 'bg-pink-500/10 text-pink-500 border-pink-500/20' : t.gender === 'Masculino' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-purple-500/10 text-purple-500 border-purple-500/20'}"
);

content = content.replace(
    /p - 3 rounded - lg border flex justify - between items - center cursor - pointer transition select - none group \$\{\s*isSelected \? 'bg-tdf-blue border-tdf-blue text-white shadow-md' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-tdf-blue'\s*\} /g,
    "p-3 rounded-lg border flex justify-between items-center cursor-pointer transition select-none group ${isSelected ? 'bg-tdf-blue border-tdf-blue text-white shadow-md' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-tdf-blue'}"
);

fs.writeFileSync(file, content);
console.log('Fixed');
