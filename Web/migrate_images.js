const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'app', 'components');

const replaceInFile = (filename, replacements) => {
    const filePath = path.join(componentsDir, filename);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add import if missing
    if (!content.includes('import Image from "next/image";') && !content.includes('import Image from \'next/image\';')) {
        content = content.replace(/import (.*?) from "(.*?)";/, `import $1 from "$2";\nimport Image from "next/image";`);
    }

    for (const [oldStr, newStr] of replacements) {
        content = content.replace(oldStr, newStr);
    }
    
    fs.writeFileSync(filePath, content);
};

// Navbar
replaceInFile('Navbar.tsx', [
    [
        '<div className="w-8 h-8 rounded-full bg-slate-800 border border-white/20 overflow-hidden">',
        '<div className="w-8 h-8 rounded-full bg-slate-800 border border-white/20 overflow-hidden relative">'
    ],
    [
        '<img src={userAvatar} alt="profile" className="w-full h-full object-cover" />',
        '<Image src={userAvatar} alt="profile" fill unoptimized className="object-cover" />'
    ]
]);

// Sidebar
replaceInFile('Sidebar.tsx', [
    [
        '<div className="w-5 h-5 rounded-full overflow-hidden bg-slate-700 border border-white/10 flex-shrink-0">',
        '<div className="w-5 h-5 rounded-full overflow-hidden bg-slate-700 border border-white/10 flex-shrink-0 relative">'
    ],
    [
        '<img src={user.avatar} alt="me" className="w-full h-full object-cover" />',
        '<Image src={user.avatar} alt="me" fill unoptimized className="object-cover" />'
    ]
]);

// PostCard
replaceInFile('PostCard.tsx', [
    [
        '<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 border border-white/10 overflow-hidden">',
        '<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 border border-white/10 overflow-hidden relative">'
    ],
    [
        '<img src={avatar} alt={author} className="w-full h-full object-cover" />',
        '<Image src={avatar} alt={author} fill unoptimized className="object-cover" />'
    ],
    [
        '<img src={item.url} alt="Post content" className="w-full h-auto object-cover max-h-[450px]" />',
        '<Image src={item.url} alt="Post content" width={800} height={450} unoptimized className="w-full h-auto object-cover max-h-[450px]" />'
    ],
    [
        '<img src={image} alt="Post content" className="w-full h-auto object-cover max-h-[400px]" />',
        '<Image src={image} alt="Post content" width={800} height={400} unoptimized className="w-full h-auto object-cover max-h-[400px]" />'
    ]
]);

// ComposeModal
replaceInFile('ComposeModal.tsx', [
    [
        '<img src={currentUser?.avatar || fallbackAvatar} alt="profile" className="w-12 h-12 rounded-full border border-white/10 object-cover" />',
        '<Image src={currentUser?.avatar || fallbackAvatar} alt="profile" width={48} height={48} unoptimized className="w-12 h-12 rounded-full border border-white/10 object-cover" />'
    ]
]);

// SuggestedUsers
replaceInFile('SuggestedUsers.tsx', [
    [
        '<img src={u.avatar || fallbackAvatar(u.username)} alt={u.name} className="w-10 h-10 rounded-full object-cover" />',
        '<Image src={u.avatar || fallbackAvatar(u.username)} alt={u.name} width={40} height={40} unoptimized className="w-10 h-10 rounded-full object-cover" />'
    ]
]);

// UserListModal
replaceInFile('UserListModal.tsx', [
    [
        '<img src={u.avatar || fallbackAvatar(u.username)} alt={u.name} className="w-12 h-12 rounded-full object-cover border border-white/10" />',
        '<Image src={u.avatar || fallbackAvatar(u.username)} alt={u.name} width={48} height={48} unoptimized className="w-12 h-12 rounded-full object-cover border border-white/10" />'
    ]
]);

// CreatePost
replaceInFile('CreatePost.tsx', [
    [
        '<img src={user?.avatar || fallbackAvatar} className="w-10 h-10 rounded-full border border-white/10 object-cover" alt="My Profile" />',
        '<Image src={user?.avatar || fallbackAvatar} width={40} height={40} unoptimized className="w-10 h-10 rounded-full border border-white/10 object-cover" alt="My Profile" />'
    ]
]);

console.log("Migration complete!");
