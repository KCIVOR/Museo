import React, { useEffect, useState } from 'react';
import { View, Platform, Dimensions, StatusBar } from 'react-native';

const AndroidFooterSpacer = ({ backgroundColor = '#fff', extra = 0 }) => {
  if (Platform.OS !== 'android') return null;
  const [h, setH] = useState(0);

  useEffect(() => {
    const compute = () => {
      const win = Dimensions.get('window');
      const scr = Dimensions.get('screen');
      const status = StatusBar.currentHeight || 0;
      const diff = Math.max(0, scr.height - win.height - status);
      setH(diff > 0 ? diff : 0);
    };
    compute();
    const sub = Dimensions.addEventListener('change', compute);
    return () => { try { sub?.remove?.(); } catch {} };
  }, []);

  const add = Number.isFinite(extra) ? extra : 0;
  const height = Math.max(0, h + add);
  if (height <= 0) return null;
  return <View style={{ height, backgroundColor }} />;
};

export default AndroidFooterSpacer;
