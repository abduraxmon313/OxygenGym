; O'rnatish / yangilashdan keyin Windows ikonka keshini tozalaydi.
; Shu sababli eski logoli shortcut qolmaydi.

!macro customInstall
  ; Windows Shell ikonka keshini yangilash — ie4uinit (Win 10/11)
  nsExec::ExecToLog 'ie4uinit.exe -show'

  ; Explorer'ga ikonkalar o'zgarganini bildirish
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0x1000, p 0, p 0)'
!macroend
