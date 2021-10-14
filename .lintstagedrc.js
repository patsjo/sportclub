/*  This is moved here from `package.json`,
    because in the new version of lint-staged, our amount of files would generate an argument string consisting of ~15k characters which would break lint-staged
    and this is the recommended way of handling cases where alot of files are fixed by prettier
*/

module.exports = {
  '**/*.{js,jsx,json,css,md}': (filenames) => filenames.map((filename) => `prettier --write '${filename}'`),
};
