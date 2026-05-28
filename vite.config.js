import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dns from 'dns'
import https from 'https'
import http from 'http'

// Create a custom DNS resolver that uses public DNS servers (Google/Cloudflare)
// to bypass local DNS resolution / router timeouts for Binance API.
const dnsResolver = new dns.Resolver()
dnsResolver.setServers(['8.8.8.8', '1.1.1.1'])

const customLookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    dns.lookup(hostname, options, callback)
    return
  }
  dnsResolver.resolve4(hostname, (err, addresses) => {
    if (err || !addresses || addresses.length === 0) {
      dns.lookup(hostname, options, callback)
    } else {
      if (options.all) {
        callback(null, addresses.map(ip => ({ address: ip, family: 4 })))
      } else {
        callback(null, addresses[0], 4)
      }
    }
  })
}

const httpsAgent = new https.Agent({ lookup: customLookup, keepAlive: true })

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/binance-fapi': {
        target: 'https://fapi.binance.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/binance-fapi/, ''),
        agent: httpsAgent
      },
      '/binance-ws': {
        target: 'wss://fstream.binance.com',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/binance-ws/, ''),
        agent: httpsAgent
      },
      '/alternative-fng': {
        target: 'https://api.alternative.me',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/alternative-fng/, ''),
        agent: httpsAgent
      }
    }
  }
})
