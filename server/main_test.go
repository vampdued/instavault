package main

import "testing"

func TestIsNativeMessagingInvocation(t *testing.T) {
	if !isNativeMessagingInvocation([]string{"chrome-extension://abcdefghijklmnop/", "--parent-window=0"}) {
		t.Fatal("Chrome origin should select native-host mode")
	}
	if !isNativeMessagingInvocation([]string{"moz-extension://abcdefghijklmnop/"}) {
		t.Fatal("Firefox origin should select native-host mode")
	}
	if isNativeMessagingInvocation([]string{"-host", "localhost"}) {
		t.Fatal("normal server arguments should not select native-host mode")
	}
}
