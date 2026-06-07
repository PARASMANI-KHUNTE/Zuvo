const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'app', 'components');

const replaceInFile = (filename, regexReplacements) => {
    const filePath = path.join(componentsDir, filename);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add import if missing
    if (!content.includes('import Image from "next/image";') && !content.includes('import Image from \'next/image\';')) {
        content = content.replace(/import (.*?) from "(.*?)";/, `import $1 from "$2";\nimport Image from "next/image";`);
    }

    for (const { rx, repl } of regexReplacements) {
        content = content.replace(rx, repl);
    }
    
    fs.writeFileSync(filePath, content);
};

// ComposeModal
replaceInFile('ComposeModal.tsx', [
    { rx: /<img\s+src=\{mediaPreview\}\s+alt="Preview"\s+className="([^"]+)"\s*\/>/g, repl: '<Image src={mediaPreview} alt="Preview" fill unoptimized className="$1 object-cover" />' },
    { rx: /<img\s+src=\{mediaItem\.url\}\s+alt="Media"\s+className="([^"]+)"\s*\/>/g, repl: '<Image src={mediaItem.url} alt="Media" fill unoptimized className="$1 object-cover" />' }
]);

// CreatePost
replaceInFile('CreatePost.tsx', [
    { rx: /<img\s+src=\{previewUrl\}\s+alt="preview"\s+className="([^"]+)"\s*\/>/g, repl: '<Image src={previewUrl} alt="preview" fill unoptimized className="$1 object-cover" />' },
    { rx: /<img\s+src=\{item\.url\}\s+className="([^"]+)"\s*\/>/g, repl: '<Image src={item.url} alt="media" fill unoptimized className="$1 object-cover" />' },
    { rx: /<div className="relative rounded-2xl overflow-hidden border border-white\/10 aspect-video group bg-slate-900">/g, repl: '<div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-video group bg-slate-900 relative">' },
    { rx: /<div className="relative rounded-2xl overflow-hidden border border-white\/10 aspect-video group">/g, repl: '<div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-video group relative">' }
]);

// LayoutWrapper
replaceInFile('LayoutWrapper.tsx', [
    { rx: /<img\s+src=\{item\.sender\.avatar || `https:\/\/api\.dicebear\.com\/7\.x\/avataaars\/svg\?seed=\$\{item\.sender\.username\}`\}\s+alt=\{item\.sender\.name\}\s+className="([^"]+)"\s*\/>/g, repl: '<Image src={item.sender.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.sender.username}`} alt={item.sender.name} width={40} height={40} unoptimized className="$1" />' }
]);

// SuggestedUsers
replaceInFile('SuggestedUsers.tsx', [
    { rx: /<img\s+src=\{u\.avatar \|\| fallbackAvatar\(u\.username\)\}\s+alt=\{u\.name\}\s+className="([^"]+)"\s*\/>/g, repl: '<Image src={u.avatar || fallbackAvatar(u.username)} alt={u.name} width={40} height={40} unoptimized className="$1" />' }
]);

// UserListModal
replaceInFile('UserListModal.tsx', [
    { rx: /<img\s+src=\{user\.avatar \|\| fallbackAvatar\(user\.username\)\}\s+alt=\{user\.name\}\s+className="([^"]+)"\s*\/>/g, repl: '<Image src={user.avatar || fallbackAvatar(user.username)} alt={user.name} width={48} height={48} unoptimized className="$1" />' }
]);

console.log("Migration complete part 2!");
