const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

walk('src').filter(f => f.endsWith('.ts') || f.endsWith('.tsx')).forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]((?:\.\.\/)+)types\/cricket['"]/g, 'import type { $1 } from \'$2types/cricket\'');
  
  // also fix single dot
  content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]\.\/types\/cricket['"]/g, 'import type { $1 } from \'./types/cricket\'');
  
  fs.writeFileSync(file, content);
});

console.log('Fixed imports');
