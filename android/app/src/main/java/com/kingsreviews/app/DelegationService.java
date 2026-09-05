package com.kingsreviews.app;

/**
 * Lets Chrome route web push notifications through this app, so they carry the
 * app's icon and name. Disabled in the manifest until the site sends any.
 */
public class DelegationService extends com.google.androidbrowserhelper.trusted.DelegationService {
}
