npm ci
mkdir package
npm pack --pack-destination package
mv package/*.tgz test-collector.tgz
npx rimraf package