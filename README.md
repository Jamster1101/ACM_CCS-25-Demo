# ACM_CCS-25-Demo
Demo of Chrome extension to implement network fingerprinting to password managers.



--This Project only works on windows using Google Chrome--

After downloading (and extracting from .zip if needed) the project, navigate to "chrome://extensions"

Ensure Developer mode is active and press the "Load unpacked" button in the top left folder

Select the "src" folder from the extracted files.

An extension named "NBAC PMC" should appear with an error. Ignore the error for now and copy the ID (should be 32 random letters)

Open the "src" folder and its contents using VS Code (or your preferred editor)

Open "native.json" from the "native-apps" folder and edit the "allowed_origins" to contain your copied ID, replacing the current 32 random letters.

Copy the entire path of the "retrieve_mac.py" file and replace the path in "MAC.bat"

Copy the entire path of "native.json" (will be needed later)

Open Registry Editor (Press Windows Key + R then enter "regedit")

Navigate to Computer -> HKEY_CURRENT_USER -> Software -> Google -> Chrome

Right Click on NativeMessagingHosts and press New -> Key, enter "com.nbac.password.manager"

Within the new "com.nbac.password.manager" file, right click "(Default)" and select "Modify.." 

In the Value data, paste the path to "native.json"

Close Registry Editor and make sure all the changes made to any files are saved then close.

Back on chrome://extensions, click on "Errors" and select "Clear all" then reload the extension (using the circular arrow)

The extension should be working, open the popup to add the current network as safe.

(The extension may have some issues when password manager fill in too quickly, once a page is loaded, delete the password and use the password manager again to ensure full functionality)
