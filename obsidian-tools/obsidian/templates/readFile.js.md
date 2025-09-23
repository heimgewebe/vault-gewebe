module.exports = async (filename) => {
  const f = app.vault.getAbstractFileByPath(filename)
  if (!f) return ""
  return await app.vault.read(f)
}