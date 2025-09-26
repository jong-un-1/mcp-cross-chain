import { config } from 'dotenv';
import getLitAction from './utils/get-lit-action';

config();

const uploadToIpfs = async (content: string) => {
  try {
    // Create FormData and append necessary fields
    const form = new FormData();
    form.append(
      'pinataMetadata',
      JSON.stringify({
        name: `Upload-${Date.now()}`,
        keyvalues: {
          timestamp: new Date().toISOString(),
        },
      }),
    );

    form.append('pinataOptions', '{\n  "cidVersion": 0\n}');

    // Convert string content to Blob as plain text
    const blob = new Blob([content], { type: 'text/plain' });
    form.append('file', blob, 'content.txt');

    // Make the API request to Pinata
    const response = await fetch(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PINATA_JWT}`,
          // Note: Don't set Content-Type header when using FormData
          // It will be set automatically with the correct boundary
        },
        body: form,
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    console.log('IPFS upload result:', result);

    // Return the upload result
    return {
      success: true,
      ipfsHash: result.IpfsHash,
      timestamp: new Date().toISOString(),
      name: result.name,
    };
  } catch (error: any) {
    console.error('Error uploading to IPFS:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

const action = getLitAction('REBALANCING_EXECUTION_IMPL');
uploadToIpfs(action).then(console.log).catch(console.error);
