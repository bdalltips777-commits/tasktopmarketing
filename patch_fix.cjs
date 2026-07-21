const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

const derivedState = `    const filteredSubmissions = submissions
    .filter(s => s.status === submissionsTab)
    .filter(s => {
      if (submissionFilterCategory !== 'All') {
        if (s.type.toLowerCase() !== submissionFilterCategory.toLowerCase()) return false;
      }
      if (submissionSearchQuery) {
        const query = submissionSearchQuery.toLowerCase();
        const email = (s.user?.email || '').toLowerCase();
        let dataStr = '';
        try {
           const parsed = typeof s.credentials_json === 'string' ? JSON.parse(s.credentials_json) : s.credentials_json;
           dataStr = Object.values(parsed || {}).join(' ').toLowerCase();
        } catch(e) {
           dataStr = String(s.credentials_json || '').toLowerCase();
        }
        return email.includes(query) || dataStr.includes(query);
      }
      return true;
    });`;

code = code.replace(derivedState, '');

code = code.replace(
  `  const pendingSubmissionsCount = submissions.filter(s => s.status === 'Pending').length;`,
  `  const pendingSubmissionsCount = submissions.filter(s => s.status === 'Pending').length;
${derivedState}
`
);

fs.writeFileSync('src/pages/Admin.tsx', code);
