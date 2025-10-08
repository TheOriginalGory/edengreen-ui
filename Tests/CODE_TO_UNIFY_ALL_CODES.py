import os

# =====================================================
# 🌿 UNIFICADOR DE CÓDIGO - EDENGREEN UI (Frontend)
# =====================================================
# Este script unifica todos los archivos de código del proyecto
# (app, components, hooks, lib, public, styles) en un solo archivo
# llamado UNIFIED_CODE.py dentro de la carpeta Tests.
# =====================================================

# 📁 Ruta base del proyecto
base_path = r"C:\Users\theor\PycharmProjects\edengreen-ui"

# 📄 Archivo de salida
output_file = os.path.join(base_path, "Tests", "UNIFIED_CODE.py")

# 📦 Carpetas a escanear
INCLUDE_DIRS = {"app", "components", "hooks", "lib", "public", "styles"}

# 🚫 Archivos a excluir
EXCLUDE_FILES = {
    "__init__.py",
    os.path.basename(__file__),  # Excluir este mismo script
    os.path.basename(output_file)
}

# 📄 Extensiones válidas
VALID_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".md", ".html"
}

codigo_unificado = []
archivos_encontrados = []
total_lineas = 0

print("🔍 Escaneando estructura de EdenGREEN UI...\n")

# Recorremos carpetas seleccionadas
for folder in INCLUDE_DIRS:
    folder_path = os.path.join(base_path, folder)
    if not os.path.exists(folder_path):
        print(f"⚠️ Carpeta no encontrada: {folder_path}")
        continue

    for root, dirs, files in os.walk(folder_path):
        for file_name in sorted(files):
            if any(file_name.endswith(ext) for ext in VALID_EXTENSIONS) and file_name not in EXCLUDE_FILES:
                file_path = os.path.join(root, file_name)
                rel_path = os.path.relpath(file_path, base_path)
                archivos_encontrados.append(rel_path)

                # Leer archivo
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        lines = f.readlines()
                except UnicodeDecodeError:
                    with open(file_path, "r", encoding="latin-1") as f:
                        lines = f.readlines()

                # Agregar encabezado
                codigo_unificado.append(f"# ======= {rel_path} =======\n")
                codigo_unificado.extend(lines)
                codigo_unificado.append("\n\n")

                total_lineas += len(lines)

# Crear carpeta Tests si no existe
os.makedirs(os.path.dirname(output_file), exist_ok=True)

# Guardar archivo final
with open(output_file, "w", encoding="utf-8") as f:
    f.writelines(codigo_unificado)

# ✅ Resultados
print("✅ Archivos incluidos en el código unificado:\n")
for a in archivos_encontrados:
    print(f" - {a}")

print(f"\n📊 Total de líneas combinadas: {total_lineas}")
print(f"✅ Archivo UNIFIED_CODE.py generado correctamente en:\n{output_file}")
