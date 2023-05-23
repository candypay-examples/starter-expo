// type Token = {
//   id: string;
//   mintSymbol: string;
//   vsToken: string;
//   vsTokenSymbol: string;
//   price: number;
// };

import axios from "axios";
import { MAINNET_TOKENS } from "./tokens";

const preciseRound = (number, precision) => {
  const multiplier = !!precision ? Math.pow(10, precision) : 1;
  return Math.ceil(number * multiplier) / multiplier;
};

// type TTokens = "sol" | "usdc" | "dust" | "samo" | "shdw" | "bonk";

const fetchTokenPrices = async (token) => {
  const tokensAddress = MAINNET_TOKENS[token.toUpperCase()].address;

  const price = await axios.get(
    `https://price.jup.ag/v4/price?ids=${tokensAddress}`
  );

  const result = {
    token: price.data.data[tokensAddress].mintSymbol.toLowerCase(),
    price: preciseRound(price.data.data[tokensAddress].price, 5),
  };

  return result;
};

export { fetchTokenPrices };
