import { provisionDrawings } from './drawings-migration';
await provisionDrawings();
console.log(JSON.stringify({ event: 'drawings.provisioned' }));
