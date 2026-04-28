 
import { DEFAULT_CENTERS } from '../../constants';

export const getL07FromFileName = (fileName: string): string => {
  const name = fileName.toUpperCase();
  const rawMappings = [
    { l07: 'BN0001.LTT', keys: ['NSL'] },
    { l07: 'BN0002.TSN', keys: ['TUS', 'TSN'] },
    { l07: 'HN0001.PHY', keys: ['HN1.PH', 'PHY', 'PH'] },
    { l07: 'HN0002.THA', keys: ['TH', 'THA'] },
    { l07: 'HN0003.HQV', keys: ['HQV'] },
    { l07: 'HN0004.LGI', keys: ['LGI', 'LG'] },
    { l07: 'HN0005.NVL', keys: ['NVL'] },
    { l07: 'HN0007.VQN', keys: ['VQ', 'VQN'] },
    { l07: 'HN0010.MDH', keys: ['MD', 'MDH'] },
    { l07: 'HN0012.NHT', keys: ['NHT', 'HM'] },
    { l07: 'HN0014.TMI', keys: ['TMI', 'TM'] },
    { l07: 'HN0015.VPU', keys: ['VPU', 'VP'] },
    { l07: 'HN0016.PDP', keys: ['PDP'] },
    { l07: 'HN0017.HNI', keys: ['HNI'] },
    { l07: 'HN0018.VTP', keys: ['VTP'] },
    { l07: 'HN0019.NTN', keys: ['NTN', 'NT'] },
    { l07: 'HN0021.NGD', keys: ['NGD'] },
    { l07: 'HN0022.NVO', keys: ['NVO'] },
    { l07: 'HN0023.LDM', keys: ['LDM', 'LD'] },
    { l07: 'HN0024.TCY', keys: ['TCY', 'TC'] },
    { l07: 'HN0025.LTT', keys: ['LTT'] },
    { l07: 'HN0026.VHG', keys: ['VHG', 'VH'] },
    { l07: 'HN0027.OPK', keys: ['OPK', 'OCP'] },
    { l07: 'HN0028.PVD', keys: ['PVD'] },
    { l07: 'HN0029.VPH', keys: ['VPH'] },
    { l07: 'HN0030.AKH', keys: ['AKH', 'AK', 'An Khanh'] },
    { l07: 'HN0031.AHG', keys: ['AHG', 'AH'] },
    { l07: 'HN0032.LLQ', keys: ['LLQ'] },
    { l07: 'HN0033.DAH', keys: ['DAH', 'DA'] },
    { l07: 'HN0034.HTN', keys: ['HTN'] },
    { l07: 'HY0001.ECP', keys: ['ECP'] },
    { l07: 'HP0001.LHP', keys: ['LHP', 'HP1', 'HP01'] },
    { l07: 'HP0002.HBT', keys: ['HBT', 'HP2', 'HP02'] },
    { l07: 'HP0003.VIN', keys: ['HP3', 'HP03'] },
    { l07: 'QN0001.HLG', keys: ['HLG', 'QN', 'HL'] },
    { l07: 'VIN001.CTG', keys: ['CTG', 'VIN'] },
    { l07: 'VP0001.PCT', keys: ['PCT', 'VP'] },
    { l07: 'TH0001.TPU', keys: ['TPU', 'TH01.TPU', 'MKT TH01.TPU'] },
    { l07: 'TN0001.LNQ', keys: ['LNQ', 'TN01.LNQ', 'MKT TN01.LNQ'] },
    { l07: 'PT0001.HVG', keys: ['HVG', 'PT01.HVG', 'MKT PT01.HVG'] },
    { l07: 'AA', keys: ['AA'] },
    { l07: 'HN0200.ASP', keys: ['HN0.ASP', 'ASP'] },
    { l07: 'MKT LOCAL NORTH', keys: ['NORTH.MKT INTERN', 'MKT LOCAL NORTH'] },
    { l07: 'ZHN0000.GY', keys: ['CAMBRIDGE', 'CONTEST QN', 'HP'] },
    { l07: 'MKT HP', keys: ['MKT HP'] },
  ];

  const allMappings: { l07: string; key: string }[] = [];
  rawMappings.forEach((m) => {
    m.keys.forEach((k) => {
      allMappings.push({ l07: m.l07, key: k.toUpperCase() });
    });
  });

  allMappings.sort((a, b) => b.key.length - a.key.length);

  for (const mapping of allMappings) {
    const escapedKey = mapping.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
      `(?:^|[^A-Z0-9_À-ỹ])(${escapedKey})(?:[^A-Z0-9_À-ỹ]|$)`,
      'i'
    );
    if (regex.test(name)) {
      return mapping.l07;
    }
  }

  for (const mapping of allMappings) {
    if (name.includes(mapping.key)) {
      return mapping.l07;
    }
  }

  return '';
};

export const getCenterInfoByL07 = (l07: string) => {
  return DEFAULT_CENTERS.find((c) => c.l07 === l07);
};
