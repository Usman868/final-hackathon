import QRCode from 'qrcode';
import config from '../config/index.js';

/**
 * Generate a data-URL QR code that encodes only the public asset URL.
 * Never encode private data.
 */
export const generateAssetQRDataURL = async (publicId) => {
  const publicUrl = `${config.clientUrl}/public/asset/${publicId}`;

  const dataUrl = await QRCode.toDataURL(publicUrl, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    margin: 2,
    width: 300,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  return { dataUrl, publicUrl };
};

/**
 * Generate a printable label payload (used by frontend for print/PDF).
 */
export const buildAssetLabelData = (asset) => {
  return {
    organizationName: asset.organizationName || config.orgName,
    assetName: asset.name,
    assetCode: asset.assetCode,
    location: asset.location,
    publicUrl: `${config.clientUrl}/public/asset/${asset.publicId}`,
    scanInstruction: 'Scan to view asset status & report an issue',
  };
};
