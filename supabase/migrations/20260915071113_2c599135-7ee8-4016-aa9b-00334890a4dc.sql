CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit TEXT NOT NULL,
  section TEXT NOT NULL,
  sub_section TEXT NOT NULL,
  main_equipment TEXT NOT NULL,
  category TEXT NOT NULL,
  subtype TEXT NOT NULL,
  sequence TEXT NOT NULL,
  year TEXT NOT NULL,
  tag_name TEXT NOT NULL UNIQUE,
  manufacturer TEXT,
  model TEXT,
  factory_serial TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO authenticated;
GRANT ALL ON public.equipment TO service_role;

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipment is publicly readable" ON public.equipment FOR SELECT USING (true);
CREATE POLICY "Anyone can add equipment" ON public.equipment FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update equipment" ON public.equipment FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete equipment" ON public.equipment FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.equipment (unit, section, sub_section, main_equipment, category, subtype, sequence, year, tag_name, manufacturer, model, factory_serial, status, notes) VALUES
('A','KSI','F1','M1','S','P','001','2026','A-KSI-F1-M1-SP001-2026','Endress+Hauser','Cerabar PMP71','EH-77120451','active','Насосны гаралтын даралт'),
('A','KSI','F1','M1','S','T','002','2025','A-KSI-F1-M1-ST002-2025','Yokogawa','YTA610','YK-330122','active','Дулаан солилцуурын температур'),
('A','DTO','F2','M3','C','C','003','2024','A-DTO-F2-M3-CC003-2024','ABB','M2M-1P','ABB-991233','maintenance','Гүйдлийн хэмжигч, шүүгээ №2'),
('B','IFO','F1','M2','A','V','004','2026','B-IFO-F1-M2-AV004-2026','Emerson','Fisher 8532','EM-450128','active','Үндсэн шугамын хаалт'),
('B','RO','F3','M1','S','L','005','2023','B-RO-F3-M1-SL005-2023','VEGA','VEGAPULS 64','VG-112098','active','Түвшний сенсор, багана 1'),
('B','FSO','F2','M4','A','S','006','2025','B-FSO-F2-M4-AS006-2025','Festo','VUVG-L10','FS-772341','inactive','Соленоид клапан, агаарын шугам'),
('A','PNS','F1','M5','S','F','007','2024','A-PNS-F1-M5-SF007-2024','Siemens','SITRANS FM','SM-880012','active','Зарцуулалт хэмжигч'),
('B','KSI','F4','M2','C','W','008','2026','B-KSI-F4-M2-CW008-2026','Schneider','PM5560','SC-660091','active','Чадлын хэмжигч');