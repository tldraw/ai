# tldraw ai module

We want to design a module that can:

1. Produce all of the information needed to prompt a model for changes
2. Provide an end-user-developer (EUD) tools to prepare, extend, or re-package this information in the context of the Editor
3. Apply changes to the editor based on response

The steps are:

- generate an input
- prepare the input
- send the input to an LLM
- (ai magic here)
- prepare the response
- apply each change

For streaming, we would need to prepare each change as it is returned from the model.

## Preparations

An EUD with knowlege of the backend would prepare the data in a way that optimizes for the backend. An example is normalizing positions, simplifying ids, converting all floating points into integers, etc.

## Changes
