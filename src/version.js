import packageJson from '../package.json';

export const APP_VERSION = packageJson.version || '1.1.0';
export const DISPLAY_VERSION = `V${packageJson.version || '1.1.0'}`;

export default APP_VERSION;
