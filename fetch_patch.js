const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');
const fetchString = `
      const { data: usersResponse } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (usersResponse) setUsersData(usersResponse);

      const { data: jobsResponse } = await supabase.from('micro_jobs').select('*').order('created_at', { ascending: false });
      if (jobsResponse) setMicroJobs(jobsResponse);
    } catch (e) {`;
content = content.replace('    } catch (e) {', fetchString);
fs.writeFileSync('src/pages/Admin.tsx', content);
