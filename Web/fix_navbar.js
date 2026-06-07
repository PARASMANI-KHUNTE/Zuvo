const fs = require('fs');
const path = require('path');

const navbarPath = path.join(__dirname, 'src', 'app', 'components', 'Navbar.tsx');
let content = fs.readFileSync(navbarPath, 'utf8');

// Fix the useChat -> useSocket issue
content = content.replace('import { useChat } from "@/hooks/useChat";', 'import { useSocket } from "@/context/SocketContext";');
content = content.replace('const { socket } = useChat();', 'const { socket } = useSocket();');

// Migrate image tags
if (!content.includes('import Image from "next/image";') && !content.includes('import Image from \'next/image\';')) {
    content = content.replace(/import (.*?) from "(.*?)";/, `import $1 from "$2";\nimport Image from "next/image";`);
}

content = content.replace('<div className="w-8 h-8 rounded-full bg-slate-800 border border-white/20 overflow-hidden">', '<div className="w-8 h-8 rounded-full bg-slate-800 border border-white/20 overflow-hidden relative">');
content = content.replace('<img src={userAvatar} alt="profile" className="w-full h-full object-cover" />', '<Image src={userAvatar} alt="profile" fill unoptimized className="object-cover" />');

fs.writeFileSync(navbarPath, content);
console.log("Navbar fixed!");
