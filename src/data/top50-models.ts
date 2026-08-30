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
  { make: 'Mahindra',      model: 'Thar',                makeSlug: 'mahindra',      modelSlug: 'thar',                segment: 'Compact SUV', exShowroomFrom: 11.5,  live: false },
  { make: 'Maruti',        model: 'Swift',               makeSlug: 'maruti',        modelSlug: 'swift',               segment: 'Hatchback',   exShowroomFrom: 6.5,   live: true  },
  { make: 'Maruti',        model: 'Brezza',              makeSlug: 'maruti',        modelSlug: 'brezza',              segment: 'Compact SUV', exShowroomFrom: 8.5,   live: false },
  { make: 'Hyundai',       model: 'Creta',               makeSlug: 'hyundai',       modelSlug: 'creta',               segment: 'Midsize SUV', exShowroomFrom: 11.1,  live: true  },
  { make: 'Tata',          model: 'Harrier',             makeSlug: 'tata',          modelSlug: 'harrier',             segment: 'Midsize SUV', exShowroomFrom: 15.5,  live: false },
  { make: 'Maruti',        model: 'Dzire',               makeSlug: 'maruti',        modelSlug: 'dzire',               segment: 'Sedan',       exShowroomFrom: 6.8,   live: false },
  { make: 'Toyota',        model: 'Innova Crysta',       makeSlug: 'toyota',        modelSlug: 'innova-crysta',       segment: 'MPV',         exShowroomFrom: 19.9,  live: true  },
  { make: 'Maruti',        model: 'Alto K10',            makeSlug: 'maruti',        modelSlug: 'alto-k10',            segment: 'Hatchback',   exShowroomFrom: 4.2,   live: false },
  { make: 'Tata',          model: 'Nexon',               makeSlug: 'tata',          modelSlug: 'nexon',               segment: 'Compact SUV', exShowroomFrom: 8.2,   live: true  },
  { make: 'Mahindra',      model: 'Bolero',              makeSlug: 'mahindra',      modelSlug: 'bolero',              segment: 'Large SUV',   exShowroomFrom: 9.8,   live: false },
  { make: 'Maruti',        model: 'Fronx',               makeSlug: 'maruti',        modelSlug: 'fronx',               segment: 'Compact SUV', exShowroomFrom: 7.5,   live: false },
  { make: 'Hyundai',       model: 'Verna',               makeSlug: 'hyundai',       modelSlug: 'verna',               segment: 'Sedan',       exShowroomFrom: 11.0,  live: false },
  { make: 'Maruti',        model: 'Wagon R',             makeSlug: 'maruti',        modelSlug: 'wagon-r',             segment: 'Hatchback',   exShowroomFrom: 5.7,   live: false },
  { make: 'Hyundai',       model: 'Venue',               makeSlug: 'hyundai',       modelSlug: 'venue',               segment: 'Compact SUV', exShowroomFrom: 7.9,   live: false },
  { make: 'Mahindra',      model: 'Scorpio-N',           makeSlug: 'mahindra',      modelSlug: 'scorpio-n',           segment: 'Large SUV',   exShowroomFrom: 13.9,  live: false },
  { make: 'Mahindra',      model: 'Scorpio',             makeSlug: 'mahindra',      modelSlug: 'scorpio',             segment: 'Large SUV',   exShowroomFrom: 13.6,  live: false },
  { make: 'Kia',           model: 'Seltos',              makeSlug: 'kia',           modelSlug: 'seltos',              segment: 'Midsize SUV', exShowroomFrom: 10.9,  live: false },
  { make: 'Hyundai',       model: 'i20',                 makeSlug: 'hyundai',       modelSlug: 'i20',                 segment: 'Hatchback',   exShowroomFrom: 7.1,   live: false },
  { make: 'Land Rover',    model: 'Range Rover',         makeSlug: 'land-rover',    modelSlug: 'range-rover',         segment: 'Large SUV',   exShowroomFrom: 268.0, live: false },
  { make: 'Renault',       model: 'Kiger',               makeSlug: 'renault',       modelSlug: 'kiger',               segment: 'Compact SUV', exShowroomFrom: 6.0,   live: false },
  { make: 'Hyundai',       model: 'Aura',                makeSlug: 'hyundai',       modelSlug: 'aura',                segment: 'Sedan',       exShowroomFrom: 6.5,   live: false },
  { make: 'Tata',          model: 'Altroz',              makeSlug: 'tata',          modelSlug: 'altroz',              segment: 'Hatchback',   exShowroomFrom: 6.7,   live: false },
  { make: 'Hyundai',       model: 'Grand i10 Nios',      makeSlug: 'hyundai',       modelSlug: 'grand-i10-nios',      segment: 'Hatchback',   exShowroomFrom: 5.9,   live: false },
  { make: 'Kia',           model: 'Sonet',               makeSlug: 'kia',           modelSlug: 'sonet',               segment: 'Compact SUV', exShowroomFrom: 7.8,   live: false },
  { make: 'Land Rover',    model: 'Defender',            makeSlug: 'land-rover',    modelSlug: 'defender',            segment: 'Large SUV',   exShowroomFrom: 100.0, live: false },
  { make: 'Tata',          model: 'Punch',               makeSlug: 'tata',          modelSlug: 'punch',               segment: 'Compact SUV', exShowroomFrom: 6.1,   live: false },
  { make: 'Honda',         model: 'City',                makeSlug: 'honda',         modelSlug: 'city',                segment: 'Sedan',       exShowroomFrom: 11.7,  live: false },
  { make: 'Honda',         model: 'Amaze',               makeSlug: 'honda',         modelSlug: 'amaze',               segment: 'Sedan',       exShowroomFrom: 7.2,   live: false },
  { make: 'Renault',       model: 'Triber',              makeSlug: 'renault',       modelSlug: 'triber',              segment: 'MPV',         exShowroomFrom: 6.4,   live: false },
  { make: 'MG',            model: 'Hector',              makeSlug: 'mg',            modelSlug: 'hector',              segment: 'Large SUV',   exShowroomFrom: 15.0,  live: false },
  { make: 'Maruti',        model: 'Jimny',               makeSlug: 'maruti',        modelSlug: 'jimny',               segment: 'Compact SUV', exShowroomFrom: 12.7,  live: false },
  { make: 'Kia',           model: 'Carens',              makeSlug: 'kia',           modelSlug: 'carens',              segment: 'MPV',         exShowroomFrom: 10.5,  live: false },
  { make: 'Mercedes-Benz', model: 'G-Class',             makeSlug: 'mercedes-benz', modelSlug: 'g-class',             segment: 'Large SUV',   exShowroomFrom: 300.0, live: false },
  { make: 'Toyota',        model: 'Hyryder',             makeSlug: 'toyota',        modelSlug: 'hyryder',             segment: 'Midsize SUV', exShowroomFrom: 11.3,  live: false },
  { make: 'Toyota',        model: 'Camry',               makeSlug: 'toyota',        modelSlug: 'camry',               segment: 'Sedan',       exShowroomFrom: 48.0,  live: false },
  { make: 'Hyundai',       model: 'Alcazar',             makeSlug: 'hyundai',       modelSlug: 'alcazar',             segment: 'Midsize SUV', exShowroomFrom: 14.7,  live: false },
  { make: 'Toyota',        model: 'Glanza',              makeSlug: 'toyota',        modelSlug: 'glanza',              segment: 'Hatchback',   exShowroomFrom: 7.0,   live: false },
  { make: 'Mercedes-Benz', model: 'E-Class',             makeSlug: 'mercedes-benz', modelSlug: 'e-class',             segment: 'Sedan',       exShowroomFrom: 78.0,  live: false },
  { make: 'Toyota',        model: 'Land Cruiser 300',    makeSlug: 'toyota',        modelSlug: 'land-cruiser-300',    segment: 'Large SUV',   exShowroomFrom: 219.0, live: false },
  { make: 'Nissan',        model: 'Magnite',             makeSlug: 'nissan',        modelSlug: 'magnite',             segment: 'Compact SUV', exShowroomFrom: 6.1,   live: false },
  { make: 'Maruti',        model: 'S-Presso',            makeSlug: 'maruti',        modelSlug: 's-presso',            segment: 'Hatchback',   exShowroomFrom: 4.3,   live: false },
  { make: 'Hyundai',       model: 'Exter',               makeSlug: 'hyundai',       modelSlug: 'exter',               segment: 'Compact SUV', exShowroomFrom: 6.0,   live: false },
  { make: 'Toyota',        model: 'Innova HyCross',      makeSlug: 'toyota',        modelSlug: 'innova-hycross',      segment: 'MPV',         exShowroomFrom: 19.1,  live: false },
  { make: 'Toyota',        model: 'Hilux',               makeSlug: 'toyota',        modelSlug: 'hilux',               segment: 'Large SUV',   exShowroomFrom: 30.4,  live: false },
  { make: 'Mahindra',      model: 'Bolero Neo',          makeSlug: 'mahindra',      modelSlug: 'bolero-neo',          segment: 'Compact SUV', exShowroomFrom: 9.5,   live: false },
  { make: 'Jeep',          model: 'Compass',             makeSlug: 'jeep',          modelSlug: 'compass',             segment: 'Midsize SUV', exShowroomFrom: 20.0,  live: false },
  { make: 'Volkswagen',    model: 'Virtus',              makeSlug: 'volkswagen',    modelSlug: 'virtus',              segment: 'Sedan',       exShowroomFrom: 11.5,  live: false },
  { make: 'Tata',          model: 'Sierra',              makeSlug: 'tata',          modelSlug: 'sierra',              segment: 'Midsize SUV', exShowroomFrom: 12.0,  live: false },
  { make: 'Tata',          model: 'Tiago',               makeSlug: 'tata',          modelSlug: 'tiago',               segment: 'Hatchback',   exShowroomFrom: 5.7,   live: false },
  { make: 'Toyota',        model: 'Fortuner',            makeSlug: 'toyota',        modelSlug: 'fortuner',            segment: 'Large SUV',   exShowroomFrom: 33.4,  live: false },
];
