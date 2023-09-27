include_file("resource://com.presonus.musicdevices/sdk/controlsurfacecomponent.js");
include_file("resource://com.presonus.musicdevices/presonus/pslsurfacecomponent.js");

const kNumChannels = 8;
const kSendSlotAll = 0;
const kSendSlotFirst = 1;

class ParamDescriptor {
    constructor(label, name, altname = "") {
        this.label = label;
        this.name = name;
        this.altname = altname;
    }
}
function getSendMuteParamID(slotIndex) {
    return PreSonus.getChannelFolderParamID(PreSonus.FolderID.kSendsFolder, PreSonus.ParamID.kSendMute, slotIndex);
}
const kTrackModeParams = [
    new ParamDescriptor("BypAll", PreSonus.ParamID.kInsertBypass),
    new ParamDescriptor("Monitr", PreSonus.ParamID.kMonitor),
    new ParamDescriptor("Input", PreSonus.ParamID.kRecordPort, PreSonus.ParamID.kPortAssignmentIn),
    new ParamDescriptor("Output", PreSonus.ParamID.kOutputPort, PreSonus.ParamID.kPortAssignmentOut),
    new ParamDescriptor("S1Byp", getSendMuteParamID(0)),
    new ParamDescriptor("S2Byp", getSendMuteParamID(1)),
    new ParamDescriptor("S3Byp", getSendMuteParamID(2)),
    new ParamDescriptor("S4Byp", getSendMuteParamID(3))
];
function getInsertBypassParamID(slotIndex) {
    return PreSonus.getChannelFolderParamID(PreSonus.FolderID.kInsertsFolder, PreSonus.ParamID.kBypass, slotIndex);
}
const kFXModeParams = [
    new ParamDescriptor("FX1Byp", getInsertBypassParamID(0)),
    new ParamDescriptor("FX2Byp", getInsertBypassParamID(1)),
    new ParamDescriptor("FX3Byp", getInsertBypassParamID(2)),
    new ParamDescriptor("FX4Byp", getInsertBypassParamID(3)),
    new ParamDescriptor("FX5Byp", getInsertBypassParamID(4)),
    new ParamDescriptor("FX6Byp", getInsertBypassParamID(5)),
    new ParamDescriptor("FX7Byp", getInsertBypassParamID(6)),
    new ParamDescriptor("FX8Byp", getInsertBypassParamID(7))
];
var ChannelAssignmentMode;
(function (ChannelAssignmentMode) {
    ChannelAssignmentMode[ChannelAssignmentMode["kTrackMode"] = 0] = "kTrackMode";
    ChannelAssignmentMode[ChannelAssignmentMode["kSendMode"] = 1] = "kSendMode";
    ChannelAssignmentMode[ChannelAssignmentMode["kPanMode"] = 2] = "kPanMode";
    ChannelAssignmentMode[ChannelAssignmentMode["kPlugMode"] = 3] = "kPlugMode";
    ChannelAssignmentMode[ChannelAssignmentMode["kFXMode"] = 4] = "kFXMode";
    ChannelAssignmentMode[ChannelAssignmentMode["kPanFocusMode"] = 5] = "kPanFocusMode";
    ChannelAssignmentMode[ChannelAssignmentMode["kLastMode"] = 5] = "kLastMode";
})(ChannelAssignmentMode || (ChannelAssignmentMode = {}));
class Assignment {
    constructor() {
        this.mode = ChannelAssignmentMode.kPanMode;
        this.sendIndex = kSendSlotAll;
        this.flipActive = false;
        this.nameValueMode = 0;
    }
    sync(other) {
        this.mode = other.mode;
        this.sendIndex = other.sendIndex;
        this.flipActive = other.flipActive;
        this.nameValueMode = other.nameValueMode;
    }
    getModeString() {
        switch (this.mode) {
            case ChannelAssignmentMode.kTrackMode:
                return "TR";
            case ChannelAssignmentMode.kSendMode:
                return this.sendIndex == kSendSlotAll ? "SE" : "S" + this.sendIndex;
            case ChannelAssignmentMode.kPanMode:
                return "PN";
            case ChannelAssignmentMode.kPanFocusMode:
                return "PX";
            case ChannelAssignmentMode.kPlugMode:
                return "CL";
            case ChannelAssignmentMode.kFXMode:
                return "FX";
            default:
                break;
        }
        return "";
    }
    navigateSends(maxSlotCount) {
        if (this.mode == ChannelAssignmentMode.kSendMode) {
            this.sendIndex++;
            if (this.sendIndex >= kSendSlotFirst + kNumChannels ||
                this.sendIndex >= kSendSlotFirst + maxSlotCount)
                this.sendIndex = kSendSlotAll;
        }
        else {
            this.mode = ChannelAssignmentMode.kSendMode;
            this.sendIndex = kSendSlotAll;
        }
    }
    isSendVisible(sendIndex) {
        return this.mode == ChannelAssignmentMode.kSendMode && this.sendIndex == sendIndex;
    }
    isPanMode() {
        return this.mode == ChannelAssignmentMode.kPanMode ||
            this.mode == ChannelAssignmentMode.kPanFocusMode;
    }
}
class ChannelInfo {
    setLabel(element, paramName) {
        return element.connectAliasParam(this.labelString, paramName);
    }
    setLabelDirect(param) {
        this.labelString.setOriginal(param);
    }
    setConstantLabel(text) {
        this.constantString.string = text;
        this.labelString.setOriginal(this.constantString);
        return true;
    }
    setFader(element, paramName) {
        return element.connectAliasParam(this.faderValue, paramName);
    }
    clearFader() {
        this.faderValue.setOriginal(null);
    }
    setPot(element, paramName) {
        return element.connectAliasParam(this.potValue, paramName);
    }
    clearPot() {
        this.potValue.setOriginal(null);
    }
    setValue(element, paramName) {
        return element.connectAliasParam(this.valueString, paramName);
    }
    clearDisplay() {
        this.labelString.setOriginal(null);
        this.valueString.setOriginal(null);
    }
}
class MackieSharedComponent extends FocusChannelPanComponent {
    onInit(hostComponent) {
        super.onInit(hostComponent);
        this.assignment = new Assignment;
        this.channelBankElement = this.mixerMapping.find("ChannelBankElement");
        this.focusSendsBankElement = this.focusChannelElement.find("SendsBankElement");
        let genericMappingElement = this.root.getGenericMapping();
        let paramList = hostComponent.paramList;
        this.channels = [];
        for (let i = 0; i < kNumChannels; i++) {
            let channelInfo = new ChannelInfo;
            channelInfo.faderValue = paramList.addAlias("faderValue" + i);
            channelInfo.potValue = paramList.addAlias("potValue" + i);
            channelInfo.labelString = paramList.addAlias("labelString" + i);
            channelInfo.valueString = paramList.addAlias("valueString" + i);
            channelInfo.constantString = paramList.addString("constantString" + i);
            channelInfo.channelElement = this.channelBankElement.getElement(i);
            channelInfo.sendsBankElement = channelInfo.channelElement.find("SendsBankElement");
            channelInfo.plugControlElement = genericMappingElement.getElement(0).find("vpot[" + i + "]");
            this.channels.push(channelInfo);
        }
    }
    onConnectChannel(channelIndex) {
        this.updateChannel(channelIndex);
    }
    onConnectChannelInsert(channelIndex, insertIndex) {
    }
    onConnectChannelSend(channelIndex, sendIndex) {
        if (this.assignment.isSendVisible(sendIndex + 1))
            this.updateChannel(channelIndex);
    }
    onConnectFocusChannel() {
        super.onConnectFocusChannel();
        if (this.assignment.mode == ChannelAssignmentMode.kTrackMode || this.assignment.mode == ChannelAssignmentMode.kFXMode)
            this.updateAll();
    }
    onConnectFocusChannelInsert(insertIndex) {
        if (this.assignment.mode == ChannelAssignmentMode.kFXMode)
            this.updateChannel(insertIndex);
    }
    onConnectFocusChannelSend(sendIndex) {
        if (this.assignment.isSendVisible(kSendSlotAll))
            this.updateChannel(sendIndex);
        else if (this.assignment.mode == ChannelAssignmentMode.kTrackMode)
            this.updateAll();
    }
    onConnectPlugControl(index) {
        if (this.assignment.mode == ChannelAssignmentMode.kPlugMode)
            this.updateChannel(index);
    }
    updateAll() {
        for (let i = 0; i < kNumChannels; i++)
            this.updateChannel(i);
    }
    updateChannel(index) {
        let channelInfo = this.channels[index];
        let channelElement = channelInfo.channelElement;
        let flipped = this.assignment.flipActive;
        let mode = this.assignment.mode;
        if (mode == ChannelAssignmentMode.kPlugMode) {
            let plugControlElement = channelInfo.plugControlElement;
            if (this.assignment.nameValueMode == 1) {
                channelInfo.setLabel(channelElement, PreSonus.ParamID.kLabel);
                channelInfo.setValue(plugControlElement, PreSonus.ParamID.kTitle);
            }
            else {
                channelInfo.setLabel(plugControlElement, PreSonus.ParamID.kTitle);
                channelInfo.setValue(plugControlElement, PreSonus.ParamID.kValue);
            }
            if (flipped) {
                channelInfo.setPot(channelElement, PreSonus.ParamID.kPan);
                channelInfo.setFader(plugControlElement, PreSonus.ParamID.kValue);
            }
            else {
                channelInfo.setPot(plugControlElement, PreSonus.ParamID.kValue);
                channelInfo.setFader(channelElement, PreSonus.ParamID.kVolume);
            }
        }
        else if (mode == ChannelAssignmentMode.kSendMode) {
            let sendElement = null;
            let useChannelName = false;
            if (this.assignment.sendIndex == kSendSlotAll)
                sendElement = this.focusSendsBankElement.getElement(index);
            else {
                sendElement = channelInfo.sendsBankElement.getElement(this.assignment.sendIndex - 1);
                useChannelName = this.assignment.nameValueMode == 1;
            }
            if (useChannelName) {
                channelInfo.setLabel(channelElement, PreSonus.ParamID.kLabel);
                channelInfo.setValue(sendElement, PreSonus.ParamID.kSendPort);
            }
            else {
                channelInfo.setLabel(sendElement, PreSonus.ParamID.kSendPort);
                channelInfo.setValue(sendElement, PreSonus.ParamID.kSendLevel);
            }
            if (flipped) {
                channelInfo.setPot(channelElement, PreSonus.ParamID.kVolume);
                channelInfo.setFader(sendElement, PreSonus.ParamID.kSendLevel);
            }
            else {
                channelInfo.setPot(sendElement, PreSonus.ParamID.kSendLevel);
                channelInfo.setFader(channelElement, PreSonus.ParamID.kVolume);
            }
        }
        else if (mode == ChannelAssignmentMode.kTrackMode || mode == ChannelAssignmentMode.kFXMode) {
            let descriptor = mode == ChannelAssignmentMode.kTrackMode ? kTrackModeParams[index] : kFXModeParams[index];
            channelInfo.setConstantLabel(descriptor.label);
            if (!channelInfo.setValue(this.focusChannelElement, descriptor.name) && descriptor.altname.length > 0)
                channelInfo.setValue(this.focusChannelElement, descriptor.altname);
            if (!channelInfo.setPot(this.focusChannelElement, descriptor.name) && descriptor.altname.length > 0)
                channelInfo.setPot(this.focusChannelElement, descriptor.altname);
            channelInfo.setFader(channelElement, PreSonus.ParamID.kVolume);
        }
        else if (mode == ChannelAssignmentMode.kPanMode) {
            channelInfo.setLabel(channelElement, PreSonus.ParamID.kLabel);
            channelInfo.setValue(channelElement, flipped ? PreSonus.ParamID.kPan : PreSonus.ParamID.kVolume);
            channelInfo.setPot(channelElement, flipped ? PreSonus.ParamID.kVolume : PreSonus.ParamID.kPan);
            channelInfo.setFader(channelElement, flipped ? PreSonus.ParamID.kPan : PreSonus.ParamID.kVolume);
        }
        else if (mode == ChannelAssignmentMode.kPanFocusMode) {
            this.updateChannelForPanFocusMode(channelInfo, index, flipped);
        }
    }
    updateChannelForPanFocusMode(channel, channelIndex, flipped) {
        let pannerType = this.getPanActiveType();
        let lastChannelIndex = kNumChannels - 1;
        channel.clearDisplay();
        channel.clearPot();
        channel.clearFader();
        if (pannerType == PreSonus.AudioPannerType.kPanTypeSimple) {
            if (channelIndex == 0)
                this.updateChannelForPanFocusAssigned(channel, PreSonus.ParamID.kPanStereoBalance, this.getPanParamTitle(channelIndex), flipped);
            else if (channelIndex == lastChannelIndex)
                this.updateChannelForPanFocusInfo(channel, flipped);
            else
                this.updateChannelForPanFocusUnassigned(channel, flipped);
        }
        else if (pannerType == PreSonus.AudioPannerType.kPanTypeDual) {
            if (channelIndex == 0)
                this.updateChannelForPanFocusAssigned(channel, PreSonus.ParamID.kPanDualLeft, this.getPanParamTitle(channelIndex), flipped);
            else if (channelIndex == 1)
                this.updateChannelForPanFocusAssigned(channel, PreSonus.ParamID.kPanDualRight, this.getPanParamTitle(channelIndex), flipped);
            else if (channelIndex == lastChannelIndex)
                this.updateChannelForPanFocusInfo(channel, flipped);
            else
                this.updateChannelForPanFocusUnassigned(channel, flipped);
        }
        else if (pannerType == PreSonus.AudioPannerType.kPanTypeBinaural) {
            if (channelIndex == 0)
                this.updateChannelForPanFocusAssigned(channel, PreSonus.ParamID.kPanBinauralBalance, this.getPanParamTitle(channelIndex), flipped);
            else if (channelIndex == 1)
                this.updateChannelForPanFocusAssigned(channel, PreSonus.ParamID.kPanBinauralWidth, this.getPanParamTitle(channelIndex), flipped);
            else if (channelIndex == lastChannelIndex)
                this.updateChannelForPanFocusInfo(channel, flipped);
            else
                this.updateChannelForPanFocusUnassigned(channel, flipped);
        }
        else {
            if (channelIndex == lastChannelIndex)
                this.updateChannelForPanFocusInfo(channel, flipped);
        }
    }
    updateChannelForPanFocusAssigned(channel, valueParamID, titleParam, flipped) {
        channel.setLabelDirect(titleParam);
        channel.setValue(this.focusChannelElement, valueParamID);
        if (flipped) {
            channel.setPot(channel.channelElement, PreSonus.ParamID.kVolume);
            channel.setFader(this.focusChannelElement, valueParamID);
        }
        else {
            channel.setPot(this.focusChannelElement, valueParamID);
            channel.setFader(channel.channelElement, PreSonus.ParamID.kVolume);
        }
    }
    ;
    updateChannelForPanFocusUnassigned(channel, flipped) {
        if (flipped)
            channel.setPot(channel.channelElement, PreSonus.ParamID.kVolume);
        else
            channel.setFader(channel.channelElement, PreSonus.ParamID.kVolume);
    }
    updateChannelForPanFocusInfo(channel, flipped) {
        channel.setLabel(this.focusChannelElement, PreSonus.ParamID.kLabel);
        channel.setValue(this.focusChannelElement, PreSonus.ParamID.kPanType);
        if (flipped) {
            channel.setPot(channel.channelElement, PreSonus.ParamID.kVolume);
            channel.setFader(this.focusChannelElement, PreSonus.ParamID.kPanStereoMode);
        }
        else {
            channel.setPot(this.focusChannelElement, PreSonus.ParamID.kPanStereoMode);
            channel.setFader(channel.channelElement, PreSonus.ParamID.kVolume);
        }
    }
    getDeviceSyncID() {
        return "MackieControl";
    }
    getSyncData() {
        return this.assignment;
    }
    onSyncDevice(otherData) {
        this.assignment.sync(otherData);
        this.updateAll();
    }
    paramChanged(param) {
    }
    updatePanModeStatus() {
        if (this.assignment.mode == ChannelAssignmentMode.kPanFocusMode)
            this.updateChannel(kNumChannels - 1);
    }
    updatePanModeControls() {
        if (this.assignment.mode == ChannelAssignmentMode.kPanFocusMode)
            this.updateAll();
    }
}
;
