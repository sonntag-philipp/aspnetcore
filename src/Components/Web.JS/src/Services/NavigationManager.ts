import '@microsoft/dotnet-js-interop';
import { resetScrollAfterNextBatch } from '../Rendering/Renderer';
import { EventDelegator } from '../Rendering/EventDelegator';

let hasEnabledNavigationInterception = false;
let hasRegisteredNavigationEventListeners = false;

// Implemented variables to disabled client side routes
let fakeLocation = {
  href: document.location.origin 
}

if (document.location.href !== (document.location.origin + "/")) {
  document.location.href = document.location.origin + "/";
}




// Will be initialized once someone registers
let notifyLocationChangedCallback: ((uri: string, intercepted: boolean) => Promise<void>) | null = null;

// These are the functions we're making available for invocation from .NET
export const internalFunctions = {
  listenForNavigationEvents,
  enableNavigationInterception,
  navigateTo,
  getBaseURI: () => document.baseURI,
  getLocationHref: () => fakeLocation.href,
};

function listenForNavigationEvents(callback: (uri: string, intercepted: boolean) => Promise<void>) {
  notifyLocationChangedCallback = callback;

  if (hasRegisteredNavigationEventListeners) {
    return;
  }

  hasRegisteredNavigationEventListeners = true; 
  window.addEventListener('popstate', (event) => {
    notifyLocationChanged(false);
  });
}

function enableNavigationInterception() {
  hasEnabledNavigationInterception = true;
}

export function attachToEventDelegator(eventDelegator: EventDelegator) {
  // We need to respond to clicks on <a> elements *after* the EventDelegator has finished
  // running its simulated bubbling process so that we can respect any preventDefault requests.
  // So instead of registering our own native event, register using the EventDelegator.
  eventDelegator.notifyAfterClick(event => {
    if (!hasEnabledNavigationInterception) {
      return;
    }

    if (event.button !== 0 || eventHasSpecialKey(event)) {
      // Don't stop ctrl/meta-click (etc) from opening links in new tabs/windows
      return;
    }

    if (event.defaultPrevented) {
      return;
    }

    // Intercept clicks on all <a> elements where the href is within the <base href> URI space
    // We must explicitly check if it has an 'href' attribute, because if it doesn't, the result might be null or an empty string depending on the browser
    const anchorTarget = findClosestAncestor(event.target as Element | null, 'A') as HTMLAnchorElement | null;
    const hrefAttributeName = 'href';
    if (anchorTarget && anchorTarget.hasAttribute(hrefAttributeName)) {
      const targetAttributeValue = anchorTarget.getAttribute('target');
      const opensInSameFrame = !targetAttributeValue || targetAttributeValue === '_self';
      if (!opensInSameFrame) {
        return;
      }

      const href = anchorTarget.getAttribute(hrefAttributeName)!;
      const absoluteHref = toAbsoluteUri(href);

      if (isWithinBaseUriSpace(absoluteHref)) {
        event.preventDefault();
        performInternalNavigation(absoluteHref, true);
      }
    }
  });
}

export function navigateTo(uri: string, forceLoad: boolean) {
  const absoluteUri = toAbsoluteUri(uri);

  if (!forceLoad && isWithinBaseUriSpace(absoluteUri)) {
    // It's an internal URL, so do client-side navigation
    console.log("Internal navigation -> Don't reload site.");
    performInternalNavigation(absoluteUri, false);
  } else if (forceLoad && fakeLocation.href === uri) {
    // Force-loading the same URL you're already on requires special handling to avoid
    // triggering browser-specific behavior issues.
    // For details about what this fixes and why, see https://github.com/dotnet/aspnetcore/pull/10839
    console.log("Forced navigation on same site -> Reload site.");
    const temporaryUri = uri + '?';
    //history.replaceState(null, '', temporaryUri);
    //location.replace(uri);
  } else {
    console.log("External or forced navigation on different site -> Reload site.");
    // It's either an external URL, or forceLoad is requested, so do a full page load
    // location.href = uri;
  }
}

function performInternalNavigation(absoluteInternalHref: string, interceptedLink: boolean) {
  // Since this was *not* triggered by a back/forward gesture (that goes through a different
  // code path starting with a popstate event), we don't want to preserve the current scroll
  // position, so reset it.
  // To avoid ugly flickering effects, we don't want to change the scroll position until the
  // we render the new page. As a best approximation, wait until the next batch.
  resetScrollAfterNextBatch();

  fakeLocation.href = absoluteInternalHref;
  history.pushState(null, /* ignored title */ '');
  notifyLocationChanged(interceptedLink);
}

async function notifyLocationChanged(interceptedLink: boolean) {
  if (notifyLocationChangedCallback) {
    await notifyLocationChangedCallback(fakeLocation.href, interceptedLink);
  }
}

let testAnchor: HTMLAnchorElement;
function toAbsoluteUri(relativeUri: string) {
  testAnchor = testAnchor || document.createElement('a');
  testAnchor.href = relativeUri;
  return testAnchor.href;
}

function findClosestAncestor(element: Element | null, tagName: string) {
  return !element
    ? null
    : element.tagName === tagName
      ? element
      : findClosestAncestor(element.parentElement, tagName);
}

function isWithinBaseUriSpace(href: string) {
  const baseUriWithTrailingSlash = toBaseUriWithTrailingSlash(document.baseURI!); // TODO: Might baseURI really be null?
  return href.startsWith(baseUriWithTrailingSlash);
}

function toBaseUriWithTrailingSlash(baseUri: string) {
  return baseUri.substr(0, baseUri.lastIndexOf('/') + 1);
}

function eventHasSpecialKey(event: MouseEvent) {
  return event.ctrlKey || event.shiftKey || event.altKey || event.metaKey;
}
