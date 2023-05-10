const asyncWrapper = require('../../middleware/asyncWrapper');
const {createCustomError} = require('../../middleware/customError');
const {createLostItem} = require('../../utils/createLostItem');
const {createSubscription} = require('../../utils/createSubRecord');
const {moveFile} = require('../../utils/moveFile');
const {logger} = require('../../utils/winstonLogger');
require('dotenv').config();

const subscriptionCtrl = asyncWrapper(async (req, res, next) => {
  const {email} = req.user;
  let {
    TIIZA_MINOR,
    TIIZA_REAL_PLUS,
    TIIZA_REAL,
    TIIZA_LITE,
    TIIZA_LITE_PLUS,
    TIIZA_MINOR_AMT,
    TIIZA_REAL_AMT,
    TIIZA_REAL_PLUS_AMT,
    TIIZA_LITE_AMT,
    TIIZA_LITE_PLUS_AMT,
    //
    TIIZA_PREMIUM_DURATION,
  } = process.env;

  let {subscriptionName, subscriptionAmount} = req.body;
  subscriptionAmount = parseFloat(subscriptionAmount);
  if (!subscriptionName)
    return res.status(400).send({
      success: false,
      payload: 'Please Choose a subscription plan',
    });
  const subscritionNames = [
    TIIZA_REAL_PLUS,
    TIIZA_REAL,
    TIIZA_LITE,
    TIIZA_LITE_PLUS,
  ];
  const subscritionAmounts = [
    parseFloat(TIIZA_REAL_AMT),
    parseFloat(TIIZA_REAL_PLUS_AMT),
    parseFloat(TIIZA_LITE_AMT),
    parseFloat(TIIZA_LITE_PLUS_AMT),
  ];
  // console.log('amount', TIIZA_REAL_AMT);
  if (subscriptionName === TIIZA_MINOR) {
    const itemInfo = req.session.lostItemDetails;
    itemInfo.lost_date = new Date(itemInfo.lost_date);
    itemInfo.customer_email = email;
    itemInfo.is_approved = false;

    const storedLostInfo = await createLostItem(
      req,
      res,
      next,
      itemInfo,
    );

    moveFile(req, res, next);
    // console.log('moved', isMoved);

    if (storedLostInfo === null) {
      logger.error('Failed to register Lost Item in Database', {
        module: 'subscriptionController.js',
        userId: req.user ? req.user.user_id : null,
        requestId: requestId,
        method: req.method,
        path: req.path,
        action: 'Save Lost Item ',
        statusCode: 500,
        clientIp: req.clientIp,
      });
      return res.status(500).send({
        success: false,
        payload: 'Sorr,Something went wrong',
      });
    }

    const isSubscribed = await createSubscription({
      subName: subscriptionName,
      item_id: storedLostInfo.item_id,
      duration: TIIZA_PREMIUM_DURATION,
      startDate: new Date(),
      endDate: new Date(
        // Date.now() + 1440 * TIIZA_PREMIUM_DURATION * 60 * 1000,
        Date.now() + 2 * 60 * 1000,
      ),
      customer_id: req.user.user_id,
    });

    if (!isSubscribed) {
      logger.error(
        `Failed to create Subscrition record.| Amount ${formatCurrency(
          amount,
        )} | Subscription duration:${TIIZA_PREMIUM_DURATION} | Subscription Name ${subName} `,
        {
          module: 'subscriptionController.js',
          userId: req.user ? req.user.user_id : null,
          requestId: requestId,
          method: req.method,
          path: req.path,
          action: 'Create Sunbscription',
          statusCode: 500,
          clientIp: req.clientIp,
        },
      );
    }
    return res.status(200).send({
      success: true,
      payload:
        'Thank you for submitting your report. We have received it and will publish it once it has been approved',
    });
  }

  if (!subscritionNames.includes(subscriptionName))
    return next(createCustomError('invalid subscription name', 400));
  if (!subscritionAmounts.includes(parseFloat(subscriptionAmount)))
    return next(
      createCustomError('invalid subscription Amount', 400),
    );

  if (
    subscriptionName === TIIZA_REAL &&
    subscriptionAmount !== parseFloat(TIIZA_REAL_AMT)
  )
    return next(
      createCustomError('Invalid subscription details', 400),
    );
  if (
    subscriptionName === TIIZA_REAL_PLUS &&
    subscriptionAmount !== parseFloat(TIIZA_REAL_PLUS_AMT)
  )
    return next(
      createCustomError('Invalid subscription details', 400),
    );
  if (
    subscriptionName === TIIZA_LITE &&
    subscriptionAmount !== parseFloat(TIIZA_LITE_PLUS_AMT)
  )
    return next(
      createCustomError('Invalid subscription details', 400),
    );
  if (
    subscriptionName === TIIZA_LITE_PLUS &&
    subscriptionAmount !== parseFloat(TIIZA_LITE_PLUS_AMT)
  )
    return next(
      createCustomError('Invalid subscription details', 400),
    );

  req.session.lostItemDetails.subscriptionName = subscriptionName;
  req.session.lostItemDetails.subscriptionAmount = subscriptionAmount;

  res.sendStatus(200);
});
module.exports = {subscriptionCtrl};