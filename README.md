## Candypay Expo Example

This example showcases how to use Candypay Checkout API with Expo.

### How to run:

Firstly create a `secrets.js` in the root folder. Add your Candypay API keys from the Candypay [dashboard](https://candypay.fun/app) like this:

```javascript
export const CANDYPAY_PUBLIC_KEY = "<YOUR_PUBLIC_KEY>";
export const CANDYPAY_PRIVATE_KEY = "<YOUR_PRIVATE_KEY>";
```

then run the following:

```bash
npm install
npm start
```

Use Expo Go mobile application to scan the QR code and run on your device.

### Docs:

- [Checkout Intro](https://docs.candypay.fun/checkout/api/introduction.html)
- [Endpoints](https://docs.candypay.fun/checkout/api/endpoints.html)
