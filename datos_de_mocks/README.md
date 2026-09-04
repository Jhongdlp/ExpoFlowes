# 📊 Datos de Mocks para Pruebas Masivas de Carga Excel

Esta carpeta contiene los archivos de prueba en formato **Excel (`.xlsx`)** listos para ser cargados manualmente desde la plataforma web (módulo **Carga Masiva de Credenciales**).

---

## 📁 Archivos Disponibles y Casos de Uso

| Archivo | Cantidad | Descripción y Caso de Prueba |
|---|---|---|
| **`01_carga_valida_stand_demo_17_participantes.xlsx`** | 17 filas | **Ajustado al stand de demostración** (*Rosas del Cotopaxi S.A.*, 25 m²). Ocupa exactamente los 17 cupos disponibles (8 Exhibitor, 3 Guest, 6 Service). Se importa 100% exitoso. |
| **`02_carga_valida_masiva_50_participantes.xlsx`** | 50 filas | **Carga masiva mediana** con 25 Exhibitor, 15 Guest y 10 Service. Variedad de Cédulas, RUCs, Pasaportes y Extranjeros. Ideal para stands grandes nuevos (ej. 50 m²). |
| **`03_carga_valida_masiva_100_participantes.xlsx`** | 100 filas | **Carga masiva pesada** para probar rendimiento del preview en frontend (SheetJS), scroll de tabla y validación en backend. |
| **`04_carga_valida_stand_pequeno_2_participantes.xlsx`** | 2 filas | **Stand pequeño (5 - 12 m²)** con cuota exacta de 2 Exhibitor. Ideal para pruebas rápidas. |
| **`05_carga_valida_stand_mediano_10_participantes.xlsx`** | 10 filas | **Stand mediano (13 - 30 m²)** con 5 Exhibitor, 2 Guest y 3 Service. |
| **`06_carga_valida_stand_grande_33_participantes.xlsx`** | 33 filas | **Ajustado al stand grande del seed** (*Andean Blooms Export S.A.*, 40 m²). Ocupa los 33 cupos disponibles (15 Exhibitor, 7 Guest, 11 Service). |
| **`07_prueba_errores_de_validacion_filas.xlsx`** | 12 filas | **Prueba de detección de errores fila por fila**. Contiene 10 filas con errores intencionales para verificar que la interfaz marque en rojo y reporte exactamente el fallo sin insertar nada. |
| **`08_prueba_exceso_de_cupo_20_expositores.xlsx`** | 20 filas | **Prueba de control de cuota máxima**. Al subirlo en un stand con menos de 20 cupos disponibles de Exhibitor, comprueba el error transaccional de cupo excedido. |
| **`09_plantilla_base_limpia.xlsx`** | 1 fila | Plantilla oficial limpia con encabezados correctos y 1 fila de ejemplo. |

---

## 🔍 Detalle del Archivo de Errores (`07_prueba_errores_de_validacion_filas.xlsx`)

Este archivo permite evaluar la robustez del sistema y el comportamiento "todo o nada" con preview en cliente:

| Fila en Excel | Columna con Error | Causa del Error |
|---|---|---|
| **Fila 2** | — | ✅ Válida (Exhibitor con Cédula válida). |
| **Fila 3** | `identificacion` | ❌ Cédula ecuatoriana con dígito verificador inválido por algoritmo módulo 10. |
| **Fila 4** | `identificacion` | ❌ RUC con código de provincia inexistente (provincia 99). |
| **Fila 5** | `nombre` | ❌ Campo obligatorio vacío. |
| **Fila 6** | `empresa_proveedora` | ❌ Categoría `Service` pero celda de empresa proveedora vacía (obligatoria condicional). |
| **Fila 7** | `empresa_proveedora` | ❌ Categoría `Exhibitor` pero con empresa proveedora ingresada (prohibida para no-Service). |
| **Fila 8** | `categoria` | ❌ Categoría inexistente (`VIP` en vez de `Exhibitor`, `Guest` o `Service`). |
| **Fila 9** | `correo` | ❌ Formato de email inválido (`correo_invalido_sin_arroba`). |
| **Fila 10** | `identificacion` | ❌ Cédula duplicada dentro del mismo archivo (repite la identificación de la Fila 2). |
| **Fila 11** | `tipo_identificacion` | ❌ Tipo de documento no reconocido (`DNI_NACIONAL`). |
| **Fila 12** | `identificacion` | ❌ Pasaporte demasiado corto (menos de 5 caracteres alfanuméricos). |
| **Fila 13** | — | ✅ Válida (Service con empresa proveedora correcta). |

---

## 🚀 Cómo Realizar las Pruebas Manualmente

### 1. Iniciar sesión como Representante
- **URL:** [http://localhost:5173/login](http://localhost:5173/login)
- **Correo:** `mariana.cevallos@rosascotopaxi.demo`
- **Contraseña:** `admin`

### 2. Ir a Carga Masiva
- Navegar a **Credenciales** en el menú superior o ingresar directamente a: [http://localhost:5173/stand/carga-masiva](http://localhost:5173/stand/carga-masiva).

### 3. Seleccionar el archivo deseado
- Hacer clic en **Examinar / Seleccionar archivo** y elegir cualquiera de los archivos `.xlsx` de esta carpeta.
- Observar el **Preview inmediato** en la tabla y la validación en tiempo real:
  - Si es válido: Aparece el botón verde **Confirmar importación**.
  - Si tiene errores (ej. archivo `07`): Se listan los errores específicos por fila y columna, deshabilitando la confirmación.

---

## 🛠️ Regenerar o Extender Mocks

Si deseas generar nuevamente los archivos o agregar más datos, puedes ejecutar el script generador:
```bash
docker compose exec backend python /app/scripts/generate_mocks.py
```
