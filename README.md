# Equipment Hub Mongolia

Create an equipment registration and inventory management web app (ХХХА Тоног төхөөрөмж бүртгэл) in Mongolian.

Features needed:
1. Registration Form:
- Fields matching the provided spec:
  - Үйлчилгээ эрхлэгч (Unit: A, B, etc.)
  - Үндсэн хэсэг (Section: KSI, DTO, IFO, RO, FSO, PNS, etc.)
  - Дэд хэсэг (Sub-section: e.g. F1)
  - Үндсэн тоног төхөөрөмж (Main equipment: e.g. M1)
  - Үндсэн ангилал (Category: Sensor S, Converter C, Actuator A)
  - Дэд ангилал / Параметр (Dynamic subtype based on category:
      S -> P Даралт, T Температур, L Түвшин, F Зарцуулалт;
      C -> C Гүйдлийн, W Чадлын, G Жингийн;
      A -> V Клапан, S Соленоид, H Гидравлик цилиндр)
  - Дарааллын дугаар (Sequence: e.g. 001)
  - Үйлдвэрлэсэн он (Year: e.g. 2026)
  - Live Tag Name / Serial generator preview box: format '{Unit}-{Section}-{SubSection}-{MainEquip}-{Category}{Subtype}{Seq}-{Year}'
  - Additional fields: Үйлдвэрлэгч (Manufacturer), Модель (Model), Үйлдвэрийн Сериал № (Factory Serial No), Байршил/Тайлбар (Notes/Location)
2. Equipment Inventory & List:
- Data table showing all registered equipment with status, tag, category, manufacturer, model, registration date
- Search by Tag name, serial number, model, manufacturer
- Filter by Category, Section, Unit
- Detailed view modal with QR code generation for the Tag name
- Export to Excel/CSV functionality
- Edit and delete equipment entries
3. Modern, clean industrial UI with dashboard stats (Total equipment, count by category, recent registrations).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://asset-mongol-hub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1aaecab3-1893-4ba2-939a-a46512fef76f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
