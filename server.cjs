const {createMacRelay} = require('./dist/relay.js');
const server = createMacRelay(process.env.BANK_RELAY_API_KEY).listen(
  Number(process.env.PORT || 3000), '0.0.0.0',
  () => console.log('Bank verification backend started')
);
function stop() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
