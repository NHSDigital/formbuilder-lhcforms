http://localhost:4201/?iss=https:%2F%2F3cdzg7kbj4.execute-api.eu-west-2.amazonaws.com%2Fpoc%2Fevents%2FFHIR%2FR4&patient=aab1dbe3-9bae-4dd2-a0e0-1d67158c0365

### Standalone App

`mvn clean install -P gitRelease`

This does the following commands: 

- ng build --configuration production --output-path docs --base-href /formbuilder-lhcforms/
- renames docs/index.html to docs/404.html (for github pages)
- git add docs folder


