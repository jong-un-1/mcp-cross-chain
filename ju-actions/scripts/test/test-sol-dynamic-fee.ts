import { config } from 'dotenv';
import { JitoService } from '../../src/utils/solana/jito';

config();

const testDynamicFee = async (): Promise<void> => {
  const envVars = {
    HELIUS_API_KEY: process.env.HELIUS_API_KEY,
    QUICKNODE_JITO_KEY: process.env.QUICKNODE_JITO_KEY,
    QUICKNODE_JITO_ENDPOINT: process.env.QUICKNODE_JITO_ENDPOINT,
  };

  const jitoService = new JitoService(envVars);
  const dynamicFee = await jitoService.getDynamicJitoFee();
  console.log('Dynamic Fee:', dynamicFee);
};

testDynamicFee();
