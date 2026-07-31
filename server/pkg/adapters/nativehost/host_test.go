package nativehost

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"testing"
)

func encodeTestFrame(t *testing.T, frame Envelope) []byte {
	t.Helper()
	data, err := json.Marshal(frame)
	if err != nil {
		t.Fatal(err)
	}
	var framed bytes.Buffer
	if err := binary.Write(&framed, binary.LittleEndian, uint32(len(data))); err != nil {
		t.Fatal(err)
	}
	framed.Write(data)
	return framed.Bytes()
}

func TestHandshakeFraming(t *testing.T) {
	request := Envelope{Protocol: ProtocolVersion, ID: "request-1", Kind: "request", Type: "session.hello"}
	input := bytes.NewReader(encodeTestFrame(t, request))
	var output bytes.Buffer
	host := New(nil, nil, nil, input, &output)
	if err := host.ListenAndServe(); err != nil {
		t.Fatalf("ListenAndServe: %v", err)
	}

	response, err := readFrame(&output)
	if err != nil {
		t.Fatalf("read response: %v", err)
	}
	if response.Protocol != ProtocolVersion || response.ID != request.ID || response.Kind != "response" || response.OK == nil || !*response.OK {
		t.Fatalf("unexpected response: %+v", response)
	}
	var payload map[string]any
	if err := json.Unmarshal(response.Payload, &payload); err != nil {
		t.Fatal(err)
	}
	if payload["protocol"] != ProtocolVersion {
		t.Fatalf("protocol = %v; want %s", payload["protocol"], ProtocolVersion)
	}
}

func TestRejectsUnsupportedProtocol(t *testing.T) {
	request := Envelope{Protocol: "instavault/999", ID: "request-2", Kind: "request", Type: "health.get"}
	input := bytes.NewReader(encodeTestFrame(t, request))
	var output bytes.Buffer
	host := New(nil, nil, nil, input, &output)
	if err := host.ListenAndServe(); err != nil {
		t.Fatalf("ListenAndServe: %v", err)
	}
	response, err := readFrame(&output)
	if err != nil {
		t.Fatal(err)
	}
	if response.OK == nil || *response.OK || response.Error == nil || response.Error.Code != "PROTOCOL_VERSION_UNSUPPORTED" {
		t.Fatalf("unexpected response: %+v", response)
	}
}
