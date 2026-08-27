// Top 50 new-car models in India by volume, for the depreciation hub grid.
// `live: true` = full model report page exists at /models/<makeSlug>/<modelSlug>.
// `live: false` = coming soon; card links to the calculator anchor instead.
// Update `live` to true as JSONs land under src/data/models/.

export type Top50Model = {
  make: string;
  model: string;
  makeSlug: string;
  modelSlug: string;
  segment: 'Hatchback' | 'Sedan' | 'Compact SUV' | 'Midsize SUV' | 'Large SUV' | 'MPV' | 'EV';
  exShowroomFrom: number; // ₹ lakh
  live: boolean;
};

export const top50Models: Top50Model[] = [
  // --- Live model reports (JSONs already shipped) ---
  { make: 'Maruti',   model: 'Swift',         makeSlug: 'maruti',   modelSlug: 'swift',         segment: 'Hatchback',   exShowroomFrom: 6.5,  live: true },
  { make: 'Maruti',   model: 'Baleno',        makeSlug: 'maruti',   modelSlug: 'baleno',        segment: 'Hatchback',   exShowroomFrom: 7.0,  live: true },
  { make: 'Hyundai',  model: 'Creta',         makeSlug: 'hyundai',  modelSlug: 'creta',         segment: 'Midsize SUV', exShowroomFrom: 11.1, live: true },
  { make: 'Tata',     model: 'Nexon',         makeSlug: 'tata',     modelSlug: 'nexon',         segment: 'Compact SUV', exShowroomFrom: 8.2,  live: true },
  { make: 'Toyota',   model: 'Innova Crysta', makeSlug: 'toyota',   modelSlug: 'innova-crysta', segment: 'MPV',         exShowroomFrom: 19.9, live: true },
  { make: 'Mahindra', model: 'XUV700',        makeSlug: 'mahindra', modelSlug: 'xuv700',        segment: 'Large SUV',   exShowroomFrom: 14.0, live: true },

  // --- Coming soon (targeted for next drop) ---
  { make: 'Maruti',   model: 'WagonR',        makeSlug: 'maruti',   modelSlug: 'wagonr',        segment: 'Hatchback',   exShowroomFrom: 5.7,  live: false },
  { make: 'Maruti',   model: 'Alto K10',      makeSlug: 'maruti',   modelSlug: 'alto-k10',      segment: 'Hatchback',   exShowroomFrom: 4.2,  live: false },
  { make: 'Maruti',   model: 'Dzire',         makeSlug: 'maruti',   modelSlug: 'dzire',         segment: 'Sedan',       exShowroomFrom: 6.8,  live: false },
  { make: 'Maruti',   model: 'Brezza',        makeSlug: 'maruti',   modelSlug: 'brezza',        segment: 'Compact SUV', exShowroomFrom: 8.5,  live: false },
  { make: 'Maruti',   model: 'Grand Vitara',  makeSlug: 'maruti',   modelSlug: 'grand-vitara',  segment: 'Midsize SUV', exShowroomFrom: 11.4, live: false },
  { make: 'Maruti',   model: 'Ertiga',        makeSlug: 'maruti',   modelSlug: 'ertiga',        segment: 'MPV',         exShowroomFrom: 8.9,  live: false },
  { make: 'Maruti',   model: 'XL6',           makeSlug: 'maruti',   modelSlug: 'xl6',           segment: 'MPV',         exShowroomFrom: 11.7, live: false },
  { make: 'Maruti',   model: 'Fronx',         makeSlug: 'maruti',   modelSlug: 'fronx',         segment: 'Compact SUV', exShowroomFrom: 7.5,  live: false },
  { make: 'Maruti',   model: 'Ignis',         makeSlug: 'maruti',   modelSlug: 'ignis',         segment: 'Hatchback',   exShowroomFrom: 5.9,  live: false },
  { make: 'Maruti',   model: 'S-Presso',      makeSlug: 'maruti',   modelSlug: 's-presso',      segment: 'Hatchback',   exShowroomFrom: 4.3,  live: false },

  { make: 'Hyundai',  model: 'i20',           makeSlug: 'hyundai',  modelSlug: 'i20',           segment: 'Hatchback',   exShowroomFrom: 7.1,  live: false },
  { make: 'Hyundai',  model: 'Grand i10 Nios',makeSlug: 'hyundai',  modelSlug: 'grand-i10-nios',segment: 'Hatchback',   exShowroomFrom: 5.9,  live: false },
  { make: 'Hyundai',  model: 'Aura',          makeSlug: 'hyundai',  modelSlug: 'aura',          segment: 'Sedan',       exShowroomFrom: 6.5,  live: false },
  { make: 'Hyundai',  model: 'Verna',         makeSlug: 'hyundai',  modelSlug: 'verna',         segment: 'Sedan',       exShowroomFrom: 11.0, live: false },
  { make: 'Hyundai',  model: 'Venue',         makeSlug: 'hyundai',  modelSlug: 'venue',         segment: 'Compact SUV', exShowroomFrom: 7.9,  live: false },
  { make: 'Hyundai',  model: 'Exter',         makeSlug: 'hyundai',  modelSlug: 'exter',         segment: 'Compact SUV', exShowroomFrom: 6.0,  live: false },
  { make: 'Hyundai',  model: 'Alcazar',       makeSlug: 'hyundai',  modelSlug: 'alcazar',       segment: 'Midsize SUV', exShowroomFrom: 14.7, live: false },
  { make: 'Hyundai',  model: 'Tucson',        makeSlug: 'hyundai',  modelSlug: 'tucson',        segment: 'Midsize SUV', exShowroomFrom: 29.0, live: false },

  { make: 'Tata',     model: 'Punch',         makeSlug: 'tata',     modelSlug: 'punch',         segment: 'Compact SUV', exShowroomFrom: 6.1,  live: false },
  { make: 'Tata',     model: 'Tiago',         makeSlug: 'tata',     modelSlug: 'tiago',         segment: 'Hatchback',   exShowroomFrom: 5.7,  live: false },
  { make: 'Tata',     model: 'Altroz',        makeSlug: 'tata',     modelSlug: 'altroz',        segment: 'Hatchback',   exShowroomFrom: 6.7,  live: false },
  { make: 'Tata',     model: 'Tigor',         makeSlug: 'tata',     modelSlug: 'tigor',         segment: 'Sedan',       exShowroomFrom: 6.3,  live: false },
  { make: 'Tata',     model: 'Harrier',       makeSlug: 'tata',     modelSlug: 'harrier',       segment: 'Midsize SUV', exShowroomFrom: 15.5, live: false },
  { make: 'Tata',     model: 'Safari',        makeSlug: 'tata',     modelSlug: 'safari',        segment: 'Large SUV',   exShowroomFrom: 16.2, live: false },
  { make: 'Tata',     model: 'Curvv',         makeSlug: 'tata',     modelSlug: 'curvv',         segment: 'Midsize SUV', exShowroomFrom: 10.0, live: false },

  { make: 'Mahindra', model: 'Scorpio-N',     makeSlug: 'mahindra', modelSlug: 'scorpio-n',     segment: 'Large SUV',   exShowroomFrom: 13.9, live: false },
  { make: 'Mahindra', model: 'Scorpio Classic',makeSlug: 'mahindra',modelSlug: 'scorpio-classic',segment: 'Large SUV',  exShowroomFrom: 13.6, live: false },
  { make: 'Mahindra', model: 'Thar',          makeSlug: 'mahindra', modelSlug: 'thar',          segment: 'Compact SUV', exShowroomFrom: 11.5, live: false },
  { make: 'Mahindra', model: 'Thar Roxx',     makeSlug: 'mahindra', modelSlug: 'thar-roxx',     segment: 'Midsize SUV', exShowroomFrom: 12.9, live: false },
  { make: 'Mahindra', model: 'XUV 3XO',       makeSlug: 'mahindra', modelSlug: 'xuv-3xo',       segment: 'Compact SUV', exShowroomFrom: 7.5,  live: false },
  { make: 'Mahindra', model: 'Bolero',        makeSlug: 'mahindra', modelSlug: 'bolero',        segment: 'Large SUV',   exShowroomFrom: 9.8,  live: false },

  { make: 'Toyota',   model: 'Fortuner',      makeSlug: 'toyota',   modelSlug: 'fortuner',      segment: 'Large SUV',   exShowroomFrom: 33.4, live: false },
  { make: 'Toyota',   model: 'Hyryder',       makeSlug: 'toyota',   modelSlug: 'hyryder',       segment: 'Midsize SUV', exShowroomFrom: 11.3, live: false },
  { make: 'Toyota',   model: 'Innova Hycross',makeSlug: 'toyota',   modelSlug: 'innova-hycross',segment: 'MPV',         exShowroomFrom: 19.1, live: false },
  { make: 'Toyota',   model: 'Rumion',        makeSlug: 'toyota',   modelSlug: 'rumion',        segment: 'MPV',         exShowroomFrom: 10.5, live: false },

  { make: 'Kia',      model: 'Seltos',        makeSlug: 'kia',      modelSlug: 'seltos',        segment: 'Midsize SUV', exShowroomFrom: 10.9, live: false },
  { make: 'Kia',      model: 'Sonet',         makeSlug: 'kia',      modelSlug: 'sonet',         segment: 'Compact SUV', exShowroomFrom: 7.8,  live: false },
  { make: 'Kia',      model: 'Carens',        makeSlug: 'kia',      modelSlug: 'carens',        segment: 'MPV',         exShowroomFrom: 10.5, live: false },

  { make: 'Honda',    model: 'City',          makeSlug: 'honda',    modelSlug: 'city',          segment: 'Sedan',       exShowroomFrom: 11.7, live: false },
  { make: 'Honda',    model: 'Amaze',         makeSlug: 'honda',    modelSlug: 'amaze',         segment: 'Sedan',       exShowroomFrom: 7.2,  live: false },
  { make: 'Honda',    model: 'Elevate',       makeSlug: 'honda',    modelSlug: 'elevate',       segment: 'Midsize SUV', exShowroomFrom: 11.6, live: false },

  { make: 'Volkswagen',model: 'Virtus',       makeSlug: 'volkswagen',modelSlug: 'virtus',       segment: 'Sedan',       exShowroomFrom: 11.5, live: false },
  { make: 'Volkswagen',model: 'Taigun',       makeSlug: 'volkswagen',modelSlug: 'taigun',       segment: 'Midsize SUV', exShowroomFrom: 11.7, live: false },
  { make: 'Skoda',    model: 'Slavia',        makeSlug: 'skoda',    modelSlug: 'slavia',        segment: 'Sedan',       exShowroomFrom: 11.6, live: false },
  { make: 'Skoda',    model: 'Kushaq',        makeSlug: 'skoda',    modelSlug: 'kushaq',        segment: 'Midsize SUV', exShowroomFrom: 11.7, live: false },
  { make: 'Skoda',    model: 'Kylaq',         makeSlug: 'skoda',    modelSlug: 'kylaq',         segment: 'Compact SUV', exShowroomFrom: 7.9,  live: false },

  { make: 'MG',       model: 'Astor',         makeSlug: 'mg',       modelSlug: 'astor',         segment: 'Midsize SUV', exShowroomFrom: 11.1, live: false },
  { make: 'MG',       model: 'Hector',        makeSlug: 'mg',       modelSlug: 'hector',        segment: 'Large SUV',   exShowroomFrom: 15.0, live: false },
  { make: 'MG',       model: 'Windsor EV',    makeSlug: 'mg',       modelSlug: 'windsor-ev',    segment: 'EV',          exShowroomFrom: 14.0, live: false },
  { make: 'Tata',     model: 'Nexon EV',      makeSlug: 'tata',     modelSlug: 'nexon-ev',      segment: 'EV',          exShowroomFrom: 12.5, live: false },
  { make: 'Tata',     model: 'Punch EV',      makeSlug: 'tata',     modelSlug: 'punch-ev',      segment: 'EV',          exShowroomFrom: 10.0, live: false },
  { make: 'Mahindra', model: 'BE 6',          makeSlug: 'mahindra', modelSlug: 'be-6',          segment: 'EV',          exShowroomFrom: 18.9, live: false },
  { make: 'Mahindra', model: 'XEV 9e',        makeSlug: 'mahindra', modelSlug: 'xev-9e',        segment: 'EV',          exShowroomFrom: 21.9, live: false },
];
