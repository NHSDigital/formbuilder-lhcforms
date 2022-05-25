/// <reference types="cypress" />

import {Util} from '../../../src/app/lib/util';

const olpExtUrl = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationLinkPeriod';
const ucumUrl = 'http://unitsofmeasure.org';
describe('Home page', () => {
  before(() => {
    // Cypress starts out with a blank slate for each test
    // so we must tell it to visit our website with the `cy.visit()` command.
    // Since we want to visit the same URL at the start of all our tests,
    // we include it in our beforeEach function so that it runs before each test
    cy.loadHomePage();
    cy.get('input[type="radio"][value="scratch"]').click();
    cy.get('button').contains('Continue').click();
  })

  describe('Item level fields', () => {
    const helpTextExtension = [{
      url: Util.ITEM_CONTROL_EXT_URL,
      valueCodeableConcept: {
        text: 'Help-Button',
        coding: [{
          code: 'help',
          display: 'Help-Button',
          system: 'http://hl7.org/fhir/questionnaire-item-control'
        }]
      }
    }];

    before(() => {
      cy.get('button').contains('Create questions').click();
    });

    beforeEach(() => {
      cy.resetForm();
      cy.contains('button', 'Create questions').click();
      cy.get('#text').should('have.value', 'Item 0', {timeout: 10000});
      cy.get('#type').as('type');
      cy.contains('.node-content-wrapper', 'Item 0').as('item0').click();
      cy.get('.btn-toolbar').contains('button', 'Add new item').as('addNewItem');
      cy.get('#__\\$helpText').as('helpText');
      cy.contains('div', 'Use question code?')
        .find('[id^="booleanControlled_Yes"]').as('codeYes');
      cy.contains('div', 'Use question code?')
        .find('[id^="booleanControlled_No"]').as('codeNo');
      cy.get('#__\\$observationLinkPeriod_No').as('olpNo');
      cy.get('#__\\$observationLinkPeriod_Yes').as('olpYes');

      cy.wait(1000);
    });

    it('should display item editor page', () => {
      cy.get('tree-root tree-viewport tree-node-collection tree-node').first().should('be.visible');
      cy.get('@codeYes').click();
      cy.get('#code\\.0\\.code').as('code');
      cy.get('@code').should('be.visible');
      cy.get('@codeNo').click();
      cy.get('@code').should('not.exist');

      cy.contains('Add new item').scrollIntoView().click();
      cy.get('tree-root tree-viewport tree-node-collection tree-node span').last().should('have.text', 'New item 1');
      cy.contains('Delete this item').scrollIntoView().click();
      cy.get('tree-root tree-viewport tree-node-collection tree-node span').last().should('have.text', 'Item 0');

      const helpString = 'Test help text!';
      cy.get('@helpText').click();
      cy.get('@helpText').type(helpString);
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].item[0].text).equal(helpString);
        expect(qJson.item[0].item[0].type).equal('display');
        expect(qJson.item[0].item[0].extension).to.deep.equal(helpTextExtension);
      });

    });

    it('should not overwrite previous tree node, when clicked before updating the editor', () => {
      const {_, $} = Cypress;
      cy.contains('button', 'Import').click();
      cy.get('form > input[placeholder="Search LOINC"]').type('vital signs, weight & height panel{downArrow}');
      cy.contains('ngb-typeahead-window button', /vital signs, weight & height panel/i).click();
      cy.get('div.spinner-border').should('not.exist');
      cy.contains('ngb-modal-window button', 'Continue').click();
      // Loading of item should pop up spinner.
      cy.get('div.spinner-border').should('be.visible');
      cy.get('div.spinner-border').should('not.exist');
      cy.getTreeNode('Vital Signs Pnl').dblclick(); // Expand node
      cy.get('#text').should('have.value', 'Vital Signs Pnl');
      cy.get('tree-root tree-viewport tree-node-collection tree-node span').then(($spans) => {
        return _.filter($spans.get(), (el) => {
          return $(el).text().match(/Resp rate|Heart rate/i);
        });
      }).click({multiple: true}); // Click the two nodes rapidly
      // cy.get('div.spinner-border').should('be.visible'); // This works in cy-open but not in cy-run?
      cy.get('div.spinner-border').should('not.exist');
      cy.get('#text').should('have.value', 'Resp rate'); // Bugfix - Should not be Heart rate
      cy.getTreeNode('Heart rate').click();
      cy.get('div.spinner-border').should('be.visible');
      cy.get('div.spinner-border').should('not.exist');
      cy.get('#text').should('have.value', 'Heart rate'); // This node should still exist.
    });

    it('should delete items', () => {
      const nestedItemsFilename = 'nested-items-delete-sample.json';
      cy.uploadFile(nestedItemsFilename, true);
      cy.contains('button', 'Edit questions').click();
      cy.get('#text').should('have.value', 'One (group)');

      // Expand the tree
      cy.getTreeNode('One (group)').dblclick();
      cy.getTreeNode('One dot seven (group): last sibling').dblclick();
      cy.getTreeNode('Two (group): last sibling').dblclick();
      cy.getTreeNode('Two dot four (group)').dblclick();

      cy.getTreeNode('Two dot four dot two').click(); // Pick a starting somewhere in the middle
      // Order of nodes loading into the editor after clicking the delete button.
      [
        'Two dot four dot two',
        'Two dot four dot three',
        'Two dot four dot four: last sibling',
        'Two dot four dot one',
        'Two dot four (group)',
        'Two dot five',
        'Two dot six',
        'Two dot seven',
        'Two dot eight',
        'Two dot nine (group): last sibling',
        'Two dot three',
        'Two dot two',
        'Two dot one',
        'Two (group): last sibling',
        'One (group)',
      ].forEach((itemText) => {
        cy.get('#text').should('have.value', itemText);
        cy.contains('button', 'Delete this item').click();
      });

      // All nodes are deleted.
      cy.get('lfb-sf-form-wrapper div.container-fluid p')
        .should('have.text', 'No items in the form. Add an item to continue.');
    });

    it('should import help text item', () => {
      const helpTextFormFilename = 'help-text-sample.json';
      const helpString = 'testing help text from import';
      cy.uploadFile(helpTextFormFilename, true);
      cy.contains('button', 'Edit questions').click();
      cy.get('@helpText').should('have.value', helpString);
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].item[0].text).equal(helpString);
        expect(qJson.item[0].item[0].type).equal('display');
        expect(qJson.item[0].item[0].extension).to.deep.equal(helpTextExtension);
      });
    });

    it('should add answer-option', () => {
      cy.addAnswerOptions();
    });

    it('should add initial values', () => {
      cy.selectDataType('string');
      cy.get('[id="initial.0.valueString"]').type('initial string');
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].type).equal('string');
        expect(qJson.item[0].initial[0].valueString).equal('initial string');
      });
      cy.selectDataType('decimal');
      cy.get('[id="initial.0.valueDecimal"]').type('100');
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].type).equal('decimal');
        expect(qJson.item[0].initial[0].valueDecimal).equal(100);
      });

      cy.selectDataType('choice');
      cy.get('[id^="initial"]').should('not.be.visible');
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].type).equal('choice');
        expect(qJson.item[0].initial).to.be.undefined;
      });

    });

    it('should import item with answer option', () => {
      const sampleFile = 'answer-option-sample.json';
      let fixtureJson;
      cy.readFile('cypress/fixtures/'+sampleFile).should((json) => {fixtureJson = json});
      cy.uploadFile(sampleFile, true);
      cy.get('#title').should('have.value', 'Answer options form');
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].answerOption).to.deep.equal(fixtureJson.item[0].answerOption);
        expect(qJson.item[0].initial).to.deep.equal(fixtureJson.item[0].initial);
      });
    });

    it('should display quantity units', () => {
      cy.get('[id^="units"]').should('not.exist'); // looking for *units*
      cy.selectDataType('quantity');
      cy.get('[id^="units"]').last().as('units');
      cy.get('@units').should('be.visible');
      cy.get('#searchResults').should('not.be.visible');
      cy.get('@units').type('inch');
      ['[in_i]', '[in_br]'].forEach((result) => {
        cy.contains('#completionOptions tr', result).click();
        cy.contains('span.autocomp_selected li', result).should('be.visible');
      });
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].type).equal('quantity');
        expect(qJson.item[0].extension[0].url).equal('http://hl7.org/fhir/StructureDefinition/questionnaire-unitOption');
        expect(qJson.item[0].extension[0].valueCoding.system).equal('http://unitsofmeasure.org');
        expect(qJson.item[0].extension[0].valueCoding.code).equal('[in_i]');
        expect(qJson.item[0].extension[0].valueCoding.display).equal('inch');
        expect(qJson.item[0].extension[1].url).equal('http://hl7.org/fhir/StructureDefinition/questionnaire-unitOption');
        expect(qJson.item[0].extension[1].valueCoding.system).equal('http://unitsofmeasure.org');
        expect(qJson.item[0].extension[1].valueCoding.code).equal('[in_br]');
        expect(qJson.item[0].extension[1].valueCoding.display).equal('inch - British');
      });
    });

    it('should display decimal/integer units', () => {
      cy.get('[id^="units"]').should('not.exist');
      cy.selectDataType('decimal');
      cy.get('[id^="units"]').last().as('units');
      cy.get('@units').should('be.visible');
      cy.get('#searchResults').should('not.be.visible');
      cy.get('@units').type('inch');
      cy.contains('#completionOptions tr', '[in_i]').click();
      cy.get('@units').last().should('have.value','[in_i]');
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].type).equal('decimal');
        expect(qJson.item[0].extension[0].url).equal('http://hl7.org/fhir/StructureDefinition/questionnaire-unit');
        expect(qJson.item[0].extension[0].valueCoding.system).equal('http://unitsofmeasure.org');
        expect(qJson.item[0].extension[0].valueCoding.code).equal('[in_i]');
        expect(qJson.item[0].extension[0].valueCoding.display).equal('inch');
      });
    });

    it('should add/edit css to text and prefix fields', () => {
      ['#text', '#prefix'].forEach((field) => {
        cy.get(field+'dropdownButton').as('cssButton');
        cy.get(field+'css').as('cssInput');
        cy.contains(field+'dropdownForm button', 'Close').as('closeButton')
        cy.get('@cssButton').click();

        cy.get('@cssInput').should('be.visible');
        cy.get('@cssInput').type('font-weight: bold;');
        cy.get('@closeButton').click();
      });

      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0]._text.extension[0].url).equal('http://hl7.org/fhir/StructureDefinition/rendering-style');
        expect(qJson.item[0]._text.extension[0].valueString).equal('font-weight: bold;');
        expect(qJson.item[0]._prefix.extension[0].url).equal('http://hl7.org/fhir/StructureDefinition/rendering-style');
        expect(qJson.item[0]._prefix.extension[0].valueString).equal('font-weight: bold;');
      });

      ['#text', '#prefix'].forEach((field) => {
        cy.get(field+'dropdownButton').as('cssButton');
        cy.get(field+'css').as('cssInput');
        cy.contains(field+'dropdownForm button', 'Close').as('closeButton')
        cy.get('@cssButton').click();

        cy.get('@cssInput').should('be.visible');
        cy.get('@cssInput').should('have.value', 'font-weight: bold;');
        cy.get('@cssInput').clear();
        cy.get('@closeButton').click();
      });

      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0]._text).to.be.undefined;
        expect(qJson.item[0]._prefix).to.be.undefined;
      });
    });

    it('should add restrictions', () => {
      cy.get('lfb-restrictions [id^="booleanControlled_Yes"]').click();

      cy.get('#__\\$restrictions\\.0\\.operator').select('Maximum length');
      cy.get('#__\\$restrictions\\.0\\.value').type('10');
      cy.contains('lfb-restrictions button', 'Add new restriction')
        .as('addRestrictionButton').click();
      cy.get('#__\\$restrictions\\.1\\.operator').select('Minimum length');
      cy.get('#__\\$restrictions\\.1\\.value').type('5');
      cy.get('@addRestrictionButton').click();
      cy.get('#__\\$restrictions\\.2\\.operator').select('Regex pattern');
      cy.get('#__\\$restrictions\\.2\\.value').type('xxx');

      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].maxLength).equal(10);
        expect(qJson.item[0].extension[0].url).equal('http://hl7.org/fhir/StructureDefinition/minLength');
        expect(qJson.item[0].extension[0].valueInteger).equal(5);
        expect(qJson.item[0].extension[1].url).equal('http://hl7.org/fhir/StructureDefinition/regex');
        expect(qJson.item[0].extension[1].valueString).equal('xxx');
      });
    });

    it('should import form with restrictions', () => {
      const sampleFile = 'restrictions-sample.json';
      let fixtureJson;
      cy.readFile('cypress/fixtures/'+sampleFile).should((json) => {fixtureJson = json});
      cy.uploadFile(sampleFile, true);
      cy.get('#title').should('have.value', 'Form with restrictions');
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0]).to.deep.equal(fixtureJson.item[0]);
      });
    });

    it('should work conditional display with answer coding source', () => {
      cy.addAnswerOptions();
      cy.contains('Add new item').scrollIntoView().click();
      cy.get('#enableWhen\\.0\\.question').type('{downarrow}{enter}');
      cy.get('#enableWhen\\.0\\.operator').select('=');
      cy.get('#enableWhen\\.0\\.answerCoding').select('d1 (c1)');

      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item.length).equal(2);
        // Verify enableWhen construct.
        expect(qJson.item[1].enableWhen.length).equal(1);
        expect(qJson.item[1].enableWhen[0].question).equal(qJson.item[0].linkId);
        expect(qJson.item[1].enableWhen[0].operator).equal('=');
        expect(qJson.item[1].enableWhen[0].answerCoding.display).equal(qJson.item[0].answerOption[0].valueCoding.display);
        expect(qJson.item[1].enableWhen[0].answerCoding.code).equal(qJson.item[0].answerOption[0].valueCoding.code);
        expect(qJson.item[1].enableWhen[0].answerCoding.system).equal(qJson.item[0].answerOption[0].valueCoding.system);
      });
    });

    it('should import form with conditional display field', () => {
      const sampleFile = 'enable-when-sample.json';
      let fixtureJson;
      cy.readFile('cypress/fixtures/'+sampleFile).should((json) => {fixtureJson = json});
      cy.uploadFile(sampleFile, true);
      cy.get('#title').should('have.value', 'US Surgeon General family health portrait');

      cy.contains('button', 'Edit questions').click();
      cy.getTreeNode('Family member health history').dblclick();
      cy.getTreeNode('Living?').dblclick();
      cy.get('lfb-answer-option table > tbody > tr').should('have.length', 3);
      cy.get('#answerOption\\.0\\.valueCoding\\.display').should('have.value', 'Yes');
      cy.get('#answerOption\\.0\\.valueCoding\\.code').should('have.value', 'LA33-6');
      cy.getTreeNode('Date of Birth').dblclick();
      cy.get('#enableWhen\\.0\\.question').should('have.value', 'Living?');
      cy.get('#enableWhen\\.0\\.operator')
        .find('option:selected').should('have.text','=');
      cy.get('#enableWhen\\.0\\.answerCoding')
        .find('option:selected').should('have.text','Yes (LA33-6)');

      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].item[0].item[0].enableWhen)
          .to.deep.equal(fixtureJson.item[0].item[0].item[0].enableWhen);
      });
    });

    xit('should create display type', () => {
      cy.get('@type').contains('string');
      cy.selectDataType('header');
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].type).equal('display');
      });
      cy.get('@addNewItem').click();

      cy.contains('.node-content-wrapper span', 'New item 1').as('item1');

      cy.dragAndDropNode('New item 1', 'Item 0'); // TODO - Not working, revisit.

      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].type).equal('group');
      });
      cy.get('@item0').dblclick();
      cy.get('@item1').click();
      cy.get('.btn-toolbar').contains('button', 'Delete this item').click();
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].type).equal('display');
      });
    });

    it('should retain header type after switching to another item and switching back', () => {
      cy.get('@type').contains('string');
      cy.selectDataType('header');
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].type).equal('display');
      });
      cy.get('@addNewItem').click();
      cy.get('@type').contains('string');
      cy.get('@item0').click();
      cy.get('@type').contains('header');
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].type).equal('display');
        expect(qJson.item[1].type).equal('string');
      });
    });

    it('should import display type', () => {
      const sampleFile = 'group-display-type-sample.json';
      let fixtureJson;
      cy.readFile('cypress/fixtures/'+sampleFile).should((json) => {fixtureJson = json});
      cy.uploadFile(sampleFile, true);
      cy.get('#title').should('have.value', 'New Form');
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].type).to.deep.equal(fixtureJson.item[0].type);
        expect(qJson.item[1].type).to.deep.equal(fixtureJson.item[1].type);
        expect(qJson.item[1].item[0].type).to.deep.equal(fixtureJson.item[1].item[0].type);
      });
    });

    it('should create observation link period', () => {
      // Yes/no option
      cy.get('@olpNo').should('be.visible').should('have.class', 'active');
      cy.get('@olpYes').should('be.visible').should('not.have.class', 'active');
      cy.get('@olpYes').click();
      // Code missing message.
      cy.get('lfb-observation-link-period > div > div > div > p').as('olpMsg')
        .should('contain.text', 'Linking to FHIR Observation');
      cy.get('[id^="observationLinkPeriod"]').should('not.exist');
      cy.get('@codeYes').click();
      cy.get('#code\\.0\\.code').type('C1');
      cy.get('@olpMsg').should('not.exist');
      cy.get('[id^="observationLinkPeriod"]').as('timeWindow')
        .should('exist').should('be.visible');
      // Time window input.
      cy.get('@timeWindow').type('2');
      // Unit selection.
      cy.get('[id^="select_observationLinkPeriod"] option:selected').should('have.text', 'years');
      cy.get('[id^="select_observationLinkPeriod"]').select('months');

      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].code[0].code).to.equal('C1');
        expect(qJson.item[0].extension[0]).to.deep.equal({
            url: olpExtUrl,
            valueDuration: {
              value: 2,
              unit: 'months',
              system: ucumUrl,
              code: 'mo'
            }
          });
      });
    });

    it('should import item with observation link period extension', () => {
      // Display of time window when item with extension is imported.
      const sampleFile = 'olp-sample.json';
      let fixtureJson, originalExtension;
      cy.readFile('cypress/fixtures/'+sampleFile).should((json) => {
        fixtureJson = json;
        originalExtension = JSON.parse(JSON.stringify(json.item[0].extension));
      });
      cy.uploadFile(sampleFile, true);
      cy.get('#title').should('have.value', 'Form with observation link period');
      cy.contains('button', 'Edit questions').click();
      cy.get('@codeYes').should('have.class', 'active');
      cy.get('#code\\.0\\.code').should('have.value', 'Code1');
      cy.get('[id^="observationLinkPeriod"]').as('timeWindow')
        .should('exist')
        .should('be.visible')
        .should('have.value', '200');
      // Unit selection.
      cy.get('[id^="select_observationLinkPeriod"] option:selected').should('have.text', 'days');

      cy.questionnaireJSON().should((qJson) => {
        expect(qJson).to.deep.equal(fixtureJson);
      });

      // Remove
      cy.get('@timeWindow').clear();
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].extension.length).to.equal(2); // Other than olp extension.
        const extExists = qJson.item[0].extension.some((ext) => {
          return ext.url === olpExtUrl;
        });
        expect(extExists).to.equal(false);
      });

    });
  });

  describe('Test descendant items and display/group type changes', () => {
    beforeEach(() => {
      const sampleFile = 'USSG-family-portrait.json';
      let fixtureJson;
      cy.readFile('cypress/fixtures/'+sampleFile).should((json) => {fixtureJson = json});
      cy.uploadFile(sampleFile, true);
      cy.get('#title').should('have.value', 'US Surgeon General family health portrait');
    });

    it('should preserve descendant item array', () => {
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].item[10].item.length).to.equal(2);
      });
    });

    it('should preserve change of datatype display', () => {
      cy.contains('button', 'Edit questions').click();
      cy.getTreeNode('My health history').dblclick();
      cy.getTreeNode('Name').click();
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].item[0].text).to.equal('Name');
        expect(qJson.item[0].item[0].type).to.equal('string');
      });
      cy.get('#text').clear().type('xxx');
      cy.get('#type').select('header');

      cy.getTreeNode('My health history').click();
      cy.getTreeNode('xxx').click();
      cy.get('#text').should('have.value', 'xxx');
      cy.get('#type').should('have.value', '12: group');

      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].item[0].text).to.equal('xxx');
        expect(qJson.item[0].item[0].type).to.equal('display');
      });
    });
  });
});
