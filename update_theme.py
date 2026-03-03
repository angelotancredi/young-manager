import os

files = [
    r'd:\MAKING-APP\young-manager\components\Header.tsx',
    r'd:\MAKING-APP\young-manager\components\DailySchedule.tsx',
    r'd:\MAKING-APP\young-manager\components\Calendar.tsx',
    r'd:\MAKING-APP\young-manager\components\Auth.tsx',
    r'd:\MAKING-APP\young-manager\components\AddScheduleModal.tsx',
    r'd:\MAKING-APP\young-manager\app\students\page.tsx',
    r'd:\MAKING-APP\young-manager\app\signup\page.tsx',
    r'd:\MAKING-APP\young-manager\app\page.tsx',
    r'd:\MAKING-APP\young-manager\app\login\page.tsx'
]

for f in files:
    if os.path.exists(f):
        try:
            with open(f, 'r', encoding='utf-8') as file:
                data = file.read()
            new_data = data.replace('indigo', 'emerald')
            with open(f, 'w', encoding='utf-8') as file:
                file.write(new_data)
            print(f'Updated {f}')
        except Exception as e:
            print(f'Error updating {f}: {e}')
