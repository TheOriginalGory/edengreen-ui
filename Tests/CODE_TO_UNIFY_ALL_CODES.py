import os

# =====================================================
# 🌿 UNIFICADOR DE CÓDIGO - EDENGREEN UI (Frontend)
# =====================================================
# Este script unifica todos los archivos de código del proyecto frontend,
# incluyendo los que se encuentran en las carpetas:
# app, components, context, hooks, lib, public, services, styles
# y los archivos sueltos en la raíz del proyecto.
#
# Crea un archivo "UNIFIED_FRONTEND_CODE.py" dentro de la carpeta "Tests".
# =====================================================

# 📁 Ruta base del proyecto frontend
base_path = r"C:\Users\theor\PycharmProjects\edengreen-ui"

# 📄 Archivo de salida
output_file = os.path.join(base_path, "Tests", "UNIFIED_FRONTEND_CODE.py")

# 📦 Carpetas a escanear
INCLUDE_DIRS = {"app", "components", "context", "hooks", "lib", "public", "services", "styles"}

# 🚫 Archivos a excluir
EXCLUDE_FILES = {
    "__init__.py",
    os.path.basename(__file__),  # Este mismo script
    os.path.basename(output_file)
}

codigo_unificado = []
archivos_encontrados = []
total_lineas = 0

print("🔍 Escaneando estructura de EdenGREEN UI...\n")

# --- 1. Archivos sueltos en la raíz ---
for file_name in sorted(os.listdir(base_path)):
    file_path = os.path.join(base_path, file_name)
    if os.path.isfile(file_path) and file_name not in EXCLUDE_FILES:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
        except UnicodeDecodeError:
            with open(file_path, "r", encoding="latin-1") as f:
                lines = f.readlines()

        codigo_unificado.append("\n")
        codigo_unificado.append("# ================================================\n")
        codigo_unificado.append(f"# 🌿 CÓDIGO COMPLETO DE: {file_name}\n")
        codigo_unificado.append("# ================================================\n\n")
        codigo_unificado.extend(lines)
        codigo_unificado.append("\n\n")

        total_lineas += len(lines)
        archivos_encontrados.append(file_name)

# --- 2. Recorrer carpetas seleccionadas ---
for folder in INCLUDE_DIRS:
    folder_path = os.path.join(base_path, folder)
    if not os.path.exists(folder_path):
        print(f"⚠️ Carpeta no encontrada: {folder_path}")
        continue

    for root, dirs, files in os.walk(folder_path):
        for file_name in sorted(files):
            if file_name not in EXCLUDE_FILES:
                file_path = os.path.join(root, file_name)
                rel_path = os.path.relpath(file_path, base_path)

                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        lines = f.readlines()
                except UnicodeDecodeError:
                    with open(file_path, "r", encoding="latin-1") as f:
                        lines = f.readlines()

                codigo_unificado.append("\n")
                codigo_unificado.append("# ================================================\n")
                codigo_unificado.append(f"# 🌿 CÓDIGO COMPLETO DE: {rel_path}\n")
                codigo_unificado.append("# ================================================\n\n")
                codigo_unificado.extend(lines)
                codigo_unificado.append("\n\n")

                total_lineas += len(lines)
                archivos_encontrados.append(rel_path)

# --- 3. Crear carpeta Tests y guardar resultado ---
os.makedirs(os.path.dirname(output_file), exist_ok=True)
with open(output_file, "w", encoding="utf-8") as f:
    f.writelines(codigo_unificado)

# --- 4. Resumen ---
print("✅ Archivos incluidos en el código unificado:\n")
for a in archivos_encontrados:
    print(f" - {a}")

print(f"\n📊 Total de líneas combinadas: {total_lineas}")
print(f"✅ Archivo UNIFIED_FRONTEND_CODE.py generado correctamente en:\n{output_file}")
