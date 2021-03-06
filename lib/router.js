const express = require('express');
const path = require('path');
const kdf = require('./kdf');
const middlewares = require('./middleware');
const authentication = require('./authentication');
const expect = require('celebrate').Joi;
const helpers = require('./helpers');
const tools = require('./tools');
const validationErrors = require('celebrate').errors;

/*
example usages:
- addRoute('test'); // add route '/test' with filename test.js or test/index.js
- addRoute('test', p1, p2, p3); // same like above, but adding parameters to the function
- addRoute({ route: 'test', module: 't1'}); adds route '/test', but uses t1.js / t1/index.js
- addRoute({ route: 'test', module: 't1'}, p1, p2, p3); like above with additional params
*/

// args may be other middlewares, that should be 'used' by this route
module.exports = (app, basePath = undefined) => (routeOpts, ...args) => {
  const self = app || this;
  const routeName = typeof routeOpts === 'string' ? routeOpts : routeOpts.route;
  const moduleName = typeof routeOpts === 'string' ? routeOpts : routeOpts.module;
  const router = Object.assign(express.Router(), helpers(routeName));
  const oldBasePath = basePath || '';
  const newBasePath = path.resolve(oldBasePath, `./${moduleName}`);

  // self.addRoute;
  router.addRoute = require('./router')(router, newBasePath); // eslint-disable-line global-require
  router.settings = {
    disabled: app.disabled,
    enabled: app.enabled,
    get: app.get,
  };
  router.locals = app.locals;
  router.kdf = kdf;
  router.authentication = authentication;
  router.middlewares = middlewares;
  router.expect = expect;
  router.tools = tools;

  require(newBasePath).call(null, router, ...args); // eslint-disable-line import/no-dynamic-require, global-require, max-len

  router.all('*', (req, res, next) => {
    const err = new Error();
    err.statusCode = 404;
    err.message = 'Not found';
    next(err);
  });

  router.use(validationErrors);
  router.use(router.middlewares.errorHandler());

  self.use(routeName, router);
};
