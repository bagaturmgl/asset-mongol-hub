ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS parameter TEXT,
  ADD COLUMN IF NOT EXISTS function_code TEXT,
  ADD COLUMN IF NOT EXISTS asset_serial TEXT;

CREATE INDEX IF NOT EXISTS equipment_asset_serial_idx ON public.equipment (asset_serial);
CREATE INDEX IF NOT EXISTS equipment_isa_idx ON public.equipment (section, sub_section, main_equipment, parameter, function_code);