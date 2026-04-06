const https = require('https');
const http = require('http');

function startKeepAlive() {
  const url = process.env.SERVER_URL || 'https://virtual-cosmos-zf12.onrender.com';
  if (!url) {
    console.log('⚠️ SERVER_URL environment variable is not set. Keep-alive cronjob is inactive.');
    console.log('💡 To prevent your server from sleeping, set SERVER_URL to your backend URL (e.g., https://your-backend.onrender.com).');
    return;
  }
  
  // 14 minutes (14 * 60 * 1000 = 840000 ms)
  // Free hosting instances (like Render) generally sleep after 15 minutes of inactivity.
  const INTERVAL = 14 * 60 * 1000; 

  console.log(`⏰ Keep-alive cronjob started. Pinging ${url} every 14 minutes.`);

  setInterval(() => {
    try {
      const pingUrl = url.endsWith('/') ? url + 'api/health' : url + '/api/health';
      const client = pingUrl.startsWith('https') ? https : http;
      
      console.log(`⏳ [Cronjob] Sending keep-alive ping to ${pingUrl}...`);
      
      client.get(pingUrl, (res) => {
        if (res.statusCode === 200) {
          console.log(`✅ [Cronjob] Keep-alive successful (Status: ${res.statusCode})`);
        } else {
          console.log(`⚠️ [Cronjob] Keep-alive responded with status: ${res.statusCode}`);
        }
      }).on('error', (err) => {
        console.error('❌ [Cronjob] Keep-alive ping failed:', err.message);
      });
    } catch (err) {
      console.error('❌ [Cronjob] Error setting up ping:', err.message);
    }
  }, INTERVAL);
}

module.exports = { startKeepAlive };
