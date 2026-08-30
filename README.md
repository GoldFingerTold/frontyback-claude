# FrontyBack — demo comercial

Este no es el sitio de ningún cliente: es la demo en vivo de FrontyBack
(frontyback.com), pensada para mostrarle a prospectos (sobre todo salones y
organizadores de eventos) cómo se ve y se edita un sitio con panel de
administración propio.

## Antes de cada pitch

Si en una demo anterior se subieron fotos o se cambiaron textos, conviene
dejarlo limpio antes de mostrárselo al próximo prospecto. Logueado en
`/admin`, se puede resetear todo (textos, galería, redes y testimonios)
llamando a:

```
POST /api/admin/demo-reset
```

(protegido por sesión de admin, igual que el resto del panel — no hay botón
en la interfaz todavía, se llama con curl o desde la consola del navegador
logueado). No borra los mensajes de contacto recibidos ni cambia la
contraseña del admin.

## Durante el pitch

La demo funciona mejor mostrando el cambio en vivo: entrá a `/admin`, subí
una foto del negocio del prospecto (banner o galería) y mostrale cómo
aparece al instante en el sitio público, sin tocar código ni depender de
nadie.

## Stack

Mismo que los sitios de clientes: Node/Express + MongoDB Atlas (contenido) +
Cloudinary (imágenes). Ver `.env.example` para las variables necesarias.
