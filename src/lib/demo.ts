export const demoProperties = [
  { id:'demo-home', label:'Home', address_line_1:'18 Cedar Lane', town:'Caterham', postcode:'CR3 6XX', type:'house', condition:'attention', membership:'Premium', last_inspection:'2026-08-18', next_inspection:'2027-08-18', photo_url:null },
  { id:'demo-rental', label:'Rental property', address_line_1:'42 Station Road', town:'Oxted', postcode:'RH8 0PG', type:'flat', condition:'good', membership:'Standard', last_inspection:'2026-06-12', next_inspection:'2027-06-12', photo_url:null }
];
export const demoDocuments = [
  {id:'d1', property_id:'demo-home', kind:'property_mot', title:'Property MOT report', issued_on:'2026-08-18', expires_on:null, evidence_status:'current', storage_path:null},
  {id:'d2', property_id:'demo-home', kind:'eicr', title:'Electrical Installation Condition Report', issued_on:'2023-10-11', expires_on:'2028-10-11', evidence_status:'current', storage_path:null},
  {id:'d3', property_id:'demo-home', kind:'gas_safety', title:'Gas Safety Certificate', issued_on:'2025-09-02', expires_on:'2026-09-02', evidence_status:'expired', storage_path:null},
  {id:'d4', property_id:'demo-rental', kind:'epc', title:'Energy Performance Certificate', issued_on:'2022-05-18', expires_on:'2032-05-18', evidence_status:'current', storage_path:null}
];
export const demoIssues = [
  {id:'i1',property_id:'demo-home', title:'Bathroom extractor underperforming',severity:'p3',status:'open',recommendation:'Arrange an electrician to check extraction and ducting.'},
  {id:'i2',property_id:'demo-home', title:'Sealant at bath edge deteriorating',severity:'p4',status:'open',recommendation:'Replace sealant to reduce the risk of water ingress.'}
];
export const demoInspections = [
  {id:'a1',property_id:'demo-home',performed_on:'2026-08-18',summary:'Property MOT completed',condition:'attention',outcome:'repairs_recommended',priority_actions:['Check bathroom extractor','Renew bath edge sealant'],specialist_follow_up:['Electrician'],inspector_comment:'Routine repairs recommended.',access_restrictions:'Loft not accessed'},
  {id:'a2',property_id:'demo-home',performed_on:'2025-08-21',summary:'Annual Property MOT',condition:'good',outcome:'no_significant_issue',priority_actions:[],specialist_follow_up:[],inspector_comment:null,access_restrictions:null},
  {id:'a3',property_id:'demo-rental',performed_on:'2026-06-12',summary:'Property MOT completed',condition:'good',outcome:'routine_maintenance',priority_actions:[],specialist_follow_up:[],inspector_comment:null,access_restrictions:null}
];
