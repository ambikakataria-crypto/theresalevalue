// Top 50 new-car models in India, sourced from the master list at
// https://docs.google.com/spreadsheets/d/1YZciXm5pNYyraRh69R4DJvjs6Q3ORMY1GEUAeq0f4DA
// Order matches the sheet's priority ranking.
//
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
  { make: 'Mahindra',      model: 'Thar',                makeSlug: 'mahindra',      modelSlug: 'thar',                segment: 'Compact SUV', exShowroomFrom: 10.55,  live: true  },
  { make: 'Maruti',        model: 'Swift',               makeSlug: 'maruti',        modelSlug: 'swift',               segment: 'Hatchback',   exShowroomFrom: 6.82,   live: true  },
  { make: 'Maruti',        model: 'Brezza',              makeSlug: 'maruti',        modelSlug: 'brezza',              segment: 'Compact SUV', exShowroomFrom: 8.29,   live: true  },
  { make: 'Hyundai',       model: 'Creta',               makeSlug: 'hyundai',       modelSlug: 'creta',               segment: 'Midsize SUV', exShowroomFrom: 12.18,  live: true  },
  { make: 'Tata',          model: 'Harrier',             makeSlug: 'tata',          modelSlug: 'harrier',             segment: 'Midsize SUV', exShowroomFrom: 15.49,  live: true  },
  { make: 'Maruti',        model: 'Dzire',               makeSlug: 'maruti',        modelSlug: 'dzire',               segment: 'Sedan',       exShowroomFrom: 6.24,   live: true  },
  { make: 'Toyota',        model: 'Innova Crysta',       makeSlug: 'toyota',        modelSlug: 'innova-crysta',       segment: 'MPV',         exShowroomFrom: 19.99,  live: true  },
  { make: 'Maruti',        model: 'Alto K10',            makeSlug: 'maruti',        modelSlug: 'alto-k10',            segment: 'Hatchback',   exShowroomFrom: 3.99,   live: true  },
  { make: 'Tata',          model: 'Nexon',               makeSlug: 'tata',          modelSlug: 'nexon',               segment: 'Compact SUV', exShowroomFrom: 7.6,   live: true  },
  { make: 'Mahindra',      model: 'Bolero',              makeSlug: 'mahindra',      modelSlug: 'bolero',              segment: 'Large SUV',   exShowroomFrom: 9.53,   live: true  },
  { make: 'Maruti',        model: 'Fronx',               makeSlug: 'maruti',        modelSlug: 'fronx',               segment: 'Compact SUV', exShowroomFrom: 7.47,   live: true  },
  { make: 'Hyundai',       model: 'Verna',               makeSlug: 'hyundai',       modelSlug: 'verna',               segment: 'Sedan',       exShowroomFrom: 10.96,  live: true  },
  { make: 'Maruti',        model: 'Wagon R',             makeSlug: 'maruti',        modelSlug: 'wagon-r',             segment: 'Hatchback',   exShowroomFrom: 5.7,   live: true  },
  { make: 'Hyundai',       model: 'Venue',               makeSlug: 'hyundai',       modelSlug: 'venue',               segment: 'Compact SUV', exShowroomFrom: 7.53,   live: true  },
  { make: 'Mahindra',      model: 'Scorpio-N',           makeSlug: 'mahindra',      modelSlug: 'scorpio-n',           segment: 'Large SUV',   exShowroomFrom: 11.99,  live: true  },
  { make: 'Mahindra',      model: 'Scorpio',             makeSlug: 'mahindra',      modelSlug: 'scorpio',             segment: 'Large SUV',   exShowroomFrom: 11.99,  live: true  },
  { make: 'Kia',           model: 'Seltos',              makeSlug: 'kia',           modelSlug: 'seltos',              segment: 'Midsize SUV', exShowroomFrom: 10.9,  live: true  },
  { make: 'Hyundai',       model: 'i20',                 makeSlug: 'hyundai',       modelSlug: 'i20',                 segment: 'Hatchback',   exShowroomFrom: 7.1,   live: true  },
  { make: 'Land Rover',    model: 'Range Rover',         makeSlug: 'land-rover',    modelSlug: 'range-rover',         segment: 'Large SUV',   exShowroomFrom: 268.0, live: true  },
  { make: 'Renault',       model: 'Kiger',               makeSlug: 'renault',       modelSlug: 'kiger',               segment: 'Compact SUV', exShowroomFrom: 5.99,   live: true  },
  { make: 'Hyundai',       model: 'Aura',                makeSlug: 'hyundai',       modelSlug: 'aura',                segment: 'Sedan',       exShowroomFrom: 6.09,   live: true  },
  { make: 'Tata',          model: 'Altroz',              makeSlug: 'tata',          modelSlug: 'altroz',              segment: 'Hatchback',   exShowroomFrom: 5.7,   live: true  },
  { make: 'Hyundai',       model: 'Grand i10 Nios',      makeSlug: 'hyundai',       modelSlug: 'grand-i10-nios',      segment: 'Hatchback',   exShowroomFrom: 5.69,   live: true  },
  { make: 'Kia',           model: 'Sonet',               makeSlug: 'kia',           modelSlug: 'sonet',               segment: 'Compact SUV', exShowroomFrom: 7.99,   live: true  },
  { make: 'Land Rover',    model: 'Defender',            makeSlug: 'land-rover',    modelSlug: 'defender',            segment: 'Large SUV',   exShowroomFrom: 100.0, live: true  },
  { make: 'Tata',          model: 'Punch',               makeSlug: 'tata',          modelSlug: 'punch',               segment: 'Compact SUV', exShowroomFrom: 5.93,   live: true  },
  { make: 'Honda',         model: 'City',                makeSlug: 'honda',         modelSlug: 'city',                segment: 'Sedan',       exShowroomFrom: 10,  live: true  },
  { make: 'Honda',         model: 'Amaze',               makeSlug: 'honda',         modelSlug: 'amaze',               segment: 'Sedan',       exShowroomFrom: 6.63,   live: true  },
  { make: 'Renault',       model: 'Triber',              makeSlug: 'renault',       modelSlug: 'triber',              segment: 'MPV',         exShowroomFrom: 5.92,   live: true  },
  { make: 'MG',            model: 'Hector',              makeSlug: 'mg',            modelSlug: 'hector',              segment: 'Large SUV',   exShowroomFrom: 14.73,  live: true  },
  { make: 'Maruti',        model: 'Jimny',               makeSlug: 'maruti',        modelSlug: 'jimny',               segment: 'Compact SUV', exShowroomFrom: 10.74,  live: true  },
  { make: 'Kia',           model: 'Carens',              makeSlug: 'kia',           modelSlug: 'carens',              segment: 'MPV',         exShowroomFrom: 9.6,  live: true  },
  { make: 'Mercedes-Benz', model: 'G-Class',             makeSlug: 'mercedes-benz', modelSlug: 'g-class',             segment: 'Large SUV',   exShowroomFrom: 300.0, live: true  },
  { make: 'Toyota',        model: 'Hyryder',             makeSlug: 'toyota',        modelSlug: 'hyryder',             segment: 'Midsize SUV', exShowroomFrom: 10.48,  live: true  },
  { make: 'Toyota',        model: 'Camry',               makeSlug: 'toyota',        modelSlug: 'camry',               segment: 'Sedan',       exShowroomFrom: 48.0,  live: true  },
  { make: 'Hyundai',       model: 'Alcazar',             makeSlug: 'hyundai',       modelSlug: 'alcazar',             segment: 'Midsize SUV', exShowroomFrom: 15.89,  live: true  },
  { make: 'Toyota',        model: 'Glanza',              makeSlug: 'toyota',        modelSlug: 'glanza',              segment: 'Hatchback',   exShowroomFrom: 6.59,   live: true  },
  { make: 'Mercedes-Benz', model: 'E-Class',             makeSlug: 'mercedes-benz', modelSlug: 'e-class',             segment: 'Sedan',       exShowroomFrom: 32,  live: true  },
  { make: 'Toyota',        model: 'Land Cruiser 300',    makeSlug: 'toyota',        modelSlug: 'land-cruiser-300',    segment: 'Large SUV',   exShowroomFrom: 219.0, live: true  },
  { make: 'Nissan',        model: 'Magnite',             makeSlug: 'nissan',        modelSlug: 'magnite',             segment: 'Compact SUV', exShowroomFrom: 5.97,   live: true  },
  { make: 'Maruti',        model: 'S-Presso',            makeSlug: 'maruti',        modelSlug: 's-presso',            segment: 'Hatchback',   exShowroomFrom: 4.25,   live: true  },
  { make: 'Hyundai',       model: 'Exter',               makeSlug: 'hyundai',       modelSlug: 'exter',               segment: 'Compact SUV', exShowroomFrom: 6,   live: true  },
  { make: 'Toyota',        model: 'Innova HyCross',      makeSlug: 'toyota',        modelSlug: 'innova-hycross',      segment: 'MPV',         exShowroomFrom: 18.3,  live: true  },
  { make: 'Toyota',        model: 'Hilux',               makeSlug: 'toyota',        modelSlug: 'hilux',               segment: 'Large SUV',   exShowroomFrom: 33.99,  live: true  },
  { make: 'Mahindra',      model: 'Bolero Neo',          makeSlug: 'mahindra',      modelSlug: 'bolero-neo',          segment: 'Compact SUV', exShowroomFrom: 9.29,   live: true  },
  { make: 'Jeep',          model: 'Compass',             makeSlug: 'jeep',          modelSlug: 'compass',             segment: 'Midsize SUV', exShowroomFrom: 19.29,  live: true  },
  { make: 'Volkswagen',    model: 'Virtus',              makeSlug: 'volkswagen',    modelSlug: 'virtus',              segment: 'Sedan',       exShowroomFrom: 11.32,  live: true  },
  { make: 'Tata',          model: 'Sierra',              makeSlug: 'tata',          modelSlug: 'sierra',              segment: 'Midsize SUV', exShowroomFrom: 12.0,  live: true  },
  { make: 'Tata',          model: 'Tiago',               makeSlug: 'tata',          modelSlug: 'tiago',               segment: 'Hatchback',   exShowroomFrom: 5.08,   live: true  },
  { make: 'Toyota',        model: 'Fortuner',            makeSlug: 'toyota',        modelSlug: 'fortuner',            segment: 'Large SUV',   exShowroomFrom: 32.4,  live: true  },
];
